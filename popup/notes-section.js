/*
 * notes-section.js — section « Notes du site » de la popup.
 *
 * Elle orchestre : lecture, création et modification des notes via
 * `notes-client.js` (qui délègue au contexte d'arrière-plan, règle 06),
 * affichage via `notes-view.js` et édition via `note-editor.js`.
 *
 * La consultation n'est pas conditionnée par l'état d'activation : les notes
 * restent consultables quand l'extension est désactivée. La création et la
 * modification, elles, ne sont accessibles que si l'extension est activée
 * (AC5) : les boutons sont créés désactivés puis ouverts après lecture d'un
 * état vrai, et la décision est revérifiée côté arrière-plan (règle 07).
 */

import { readActivationEnabled, watchActivationEnabled } from "../shared/activation-state.js";
import { isValidNote } from "../shared/note.js";
import { findElements } from "./find-elements.js";
import { createNoteEditor } from "./note-editor.js";
import { createNoteForActiveTab, requestNotesForActiveTab, updateNoteForActiveTab } from "./notes-client.js";
import { focusNoteEditAction } from "./note-item.js";
import {
  getNoteSaveFailureText,
  renderLoading,
  renderNotes,
  renderViewFailure,
  setNoteActionsEnabled,
} from "./notes-view.js";

const NOTE_CREATED_MESSAGE = { text: "Note enregistrée.", state: "saved" };
const NOTE_UPDATED_MESSAGE = { text: "Note modifiée.", state: "saved" };

const ELEMENT_IDS = {
  site: "notes-site",
  message: "notes-message",
  list: "notes-list",
  createButton: "create-note",
};

/** Hôte du site affiché, utilisé pour situer la note en cours d'édition. */
let displayedSiteHost = null;

/** Actions sur les notes ouvertes : vrai après lecture d'un état d'activation vrai. */
let isNotesEditingEnabled = false;

/** Éditeur partagé par la création et la modification, `null` si la popup est incomplète. */
let noteEditor = null;

/**
 * Relit les notes du site courant et les affiche.
 * Ne rejette jamais : toute erreur est signalée dans l'interface.
 *
 * @param {{ site: HTMLElement, message: HTMLElement, list: HTMLElement }} elements
 * @param {{ text: string, state: string } | null} message Message à afficher en
 *   cas de succès (par défaut : le nombre de notes du site).
 */
async function refreshNotes(elements, message = null) {
  const result = await requestNotesForActiveTab();

  if (!result.ok) {
    displayedSiteHost = renderViewFailure(elements, result.reason);
    return;
  }

  displayedSiteHost = renderNotes(elements, result.siteUrl, result.notes.filter(isValidNote), {
    message,
    canEdit: isNotesEditingEnabled,
    onEdit: noteEditor === null ? null : openNoteEditor,
  });
}

/**
 * Charge les notes du site courant en annonçant le chargement.
 *
 * @param {{ site: HTMLElement, message: HTMLElement, list: HTMLElement }} elements
 */
async function loadNotes(elements) {
  displayedSiteHost = renderLoading(elements);

  await refreshNotes(elements);
}

/**
 * Ouvre l'éditeur sur la note choisie (AC1).
 *
 * @param {object} note Note affichée, déjà validée.
 * @param {HTMLButtonElement} trigger Bouton « Modifier » de cette note.
 */
function openNoteEditor(note, trigger) {
  noteEditor.openEdit({ note, siteHost: displayedSiteHost, trigger });
}

/**
 * Ouvre ou ferme l'accès aux actions sur les notes (AC5).
 *
 * @param {{ list: HTMLElement }} elements
 * @param {boolean} isEnabled
 */
function setNotesEditingEnabled(elements, isEnabled) {
  isNotesEditingEnabled = isEnabled;
  setNoteActionsEnabled(elements, isEnabled);
}

/**
 * Lit l'état d'activation pour ouvrir ou fermer les actions sur les notes.
 * En cas d'échec de lecture, l'accès reste fermé (état le moins permissif).
 *
 * @param {{ list: HTMLElement }} elements
 */
async function refreshNotesEditing(elements) {
  try {
    setNotesEditingEnabled(elements, await readActivationEnabled());
  } catch (error) {
    console.error("Bref : lecture de l'état d'activation impossible pour les actions sur les notes.", error);
    setNotesEditingEnabled(elements, false);
  }
}

/**
 * Enregistre le brouillon de l'éditeur : création, ou modification de la note
 * visée. Ensuite, la liste est relue depuis le stockage : ce qui est affiché
 * correspond donc toujours à ce qui est réellement enregistré.
 *
 * En cas d'échec, l'éditeur reste ouvert avec le texte saisi : rien n'est écrit
 * tant que l'enregistrement n'a pas réussi (AC4).
 *
 * @param {{ site: HTMLElement, message: HTMLElement, list: HTMLElement }} elements
 * @param {{ close: () => void, showError: (message: string) => void }} editor
 * @param {{ noteId: string | null, content: string }} draft
 */
async function saveNote(elements, editor, draft) {
  const isCreation = draft.noteId === null;
  const result = isCreation
    ? await createNoteForActiveTab(draft.content)
    : await updateNoteForActiveTab(draft.noteId, draft.content);

  if (!result.ok) {
    editor.showError(getNoteSaveFailureText(result.reason));
    return;
  }

  editor.close();
  await refreshNotes(elements, isCreation ? NOTE_CREATED_MESSAGE : NOTE_UPDATED_MESSAGE);

  // La liste vient d'être re-rendue : le bouton qui avait ouvert l'éditeur
  // n'existe plus, le focus est donc placé sur le nouveau bouton de la note
  // modifiée (règle 10). Une création laisse le focus sur « Créer une note »,
  // qui n'est pas re-rendu.
  if (!isCreation) {
    focusNoteEditAction(elements.list, draft.noteId);
  }
}

/**
 * Initialise la section : câble l'éditeur, suit l'état d'activation et affiche
 * les notes du site courant.
 *
 * @returns {() => void} nettoyage des écouteurs, à appeler à la fermeture de la
 *   popup (règle 11).
 */
export function initNotesSection() {
  const elements = findElements("notes", ELEMENT_IDS);
  if (elements === null) {
    return () => {};
  }

  noteEditor = createNoteEditor({
    onSubmit: (draft, editor) => saveNote(elements, editor, draft),
  });

  const onCreateClick = () => {
    noteEditor.openCreate({ siteHost: displayedSiteHost, trigger: elements.createButton });
  };

  const unwatchActivation = watchActivationEnabled((isEnabled) => {
    setNotesEditingEnabled(elements, isEnabled);
  });

  if (noteEditor !== null) {
    elements.createButton.addEventListener("click", onCreateClick);
  }

  void refreshNotesEditing(elements);
  void loadNotes(elements);

  return () => {
    unwatchActivation();
    elements.createButton.removeEventListener("click", onCreateClick);
  };
}
