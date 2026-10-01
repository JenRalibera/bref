/*
 * notes-section.js — section « Notes du site » de la popup.
 *
 * Ce module assure le câblage de la section : il crée l'éditeur et la
 * confirmation de suppression, les confie à la gestion de la liste
 * (`notes-list.js`), suit l'état d'activation et affiche les notes du site
 * courant.
 *
 * La consultation n'est pas conditionnée par l'état d'activation : les notes
 * restent consultables quand l'extension est désactivée. La création, la
 * modification et la suppression, elles, ne sont accessibles que si l'extension
 * est activée (AC5) : les boutons sont créés désactivés puis ouverts après
 * lecture d'un état vrai, et la décision est revérifiée côté arrière-plan
 * (règle 07).
 */

import { readActivationEnabled, watchActivationEnabled } from "../shared/activation-state.js";
import { createDeleteConfirmation } from "./delete-confirm.js";
import { findElements } from "./find-elements.js";
import { createNoteEditor } from "./note-editor.js";
import { createNotesList } from "./notes-list.js";

const ELEMENT_IDS = {
  site: "notes-site",
  message: "notes-message",
  list: "notes-list",
  createButton: "create-note",
};

/**
 * Initialise la section : câble l'éditeur, la confirmation de suppression et
 * la liste, puis suit l'état d'activation et affiche les notes du site courant.
 *
 * @returns {() => void} nettoyage des écouteurs, à appeler à la fermeture de la
 *   popup (règle 11).
 */
export function initNotesSection() {
  const elements = findElements("section des notes", ELEMENT_IDS);
  if (elements === null) {
    return () => {};
  }

  // Les deux callbacks ne sont appelés qu'après l'initialisation complète :
  // `notesList` est donc toujours défini au moment de leur exécution.
  const noteEditor = createNoteEditor({
    onSubmit: (draft, editor) => notesList.saveNote(editor, draft),
  });
  const deleteConfirmation = createDeleteConfirmation({
    onConfirm: (note, dialog) => notesList.removeNote(note, dialog),
  });
  const notesList = createNotesList({ elements, noteEditor, deleteConfirmation });

  const onCreateClick = () => {
    notesList.openCreate();
  };

  const unwatchActivation = watchActivationEnabled((isEnabled) => {
    notesList.setEnabled(isEnabled);
  });

  if (noteEditor !== null) {
    elements.createButton.addEventListener("click", onCreateClick);
  }

  void refreshActivation(notesList);
  void notesList.load();

  return () => {
    unwatchActivation();
    elements.createButton.removeEventListener("click", onCreateClick);
  };
}

/**
 * Lit l'état d'activation pour ouvrir ou fermer les actions sur les notes.
 * En cas d'échec de lecture, l'accès reste fermé (état le moins permissif).
 *
 * @param {{ setEnabled: (isEnabled: boolean) => void }} notesList
 */
async function refreshActivation(notesList) {
  try {
    notesList.setEnabled(await readActivationEnabled());
  } catch (error) {
    console.error("Bref : lecture de l'état d'activation impossible pour les actions sur les notes.", error);
    notesList.setEnabled(false);
  }
}
