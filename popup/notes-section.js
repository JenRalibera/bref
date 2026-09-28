/*
 * notes-section.js — section « Notes du site » de la popup.
 *
 * Elle orchestre : lecture et création des notes via `notes-client.js` (qui
 * délègue au contexte d'arrière-plan, règle 06), affichage via `notes-view.js`
 * et édition via `note-editor.js`.
 *
 * La consultation n'est pas conditionnée par l'état d'activation : les notes
 * restent consultables quand l'extension est désactivée. La création, elle,
 * n'est accessible que si l'extension est activée (bouton dans le <fieldset>
 * désactivé) et reste revérifiée côté arrière-plan (AC5, règle 07).
 */

import { isValidNote } from "../shared/note.js";
import { findElements } from "./find-elements.js";
import { createNoteEditor } from "./note-editor.js";
import { createNoteForActiveTab, requestNotesForActiveTab } from "./notes-client.js";
import { getCreateFailureText, renderLoading, renderNotes, renderViewFailure } from "./notes-view.js";

const NOTES_SAVED_MESSAGE = { text: "Note enregistrée.", state: "saved" };

const ELEMENT_IDS = {
  site: "notes-site",
  message: "notes-message",
  list: "notes-list",
  createButton: "create-note",
};

/** Hôte du site affiché, utilisé pour situer la note en cours de création. */
let displayedSiteHost = null;

/**
 * Relit les notes du site courant et les affiche.
 * Ne rejette jamais : toute erreur est signalée dans l'interface.
 *
 * @param {{ site: HTMLElement, message: HTMLElement, list: HTMLElement }} elements
 * @param {{ text: string, state: string } | null} loadedMessage Message à
 *   afficher en cas de succès (par défaut : le nombre de notes du site).
 */
async function refreshNotes(elements, loadedMessage = null) {
  const result = await requestNotesForActiveTab();

  if (!result.ok) {
    displayedSiteHost = renderViewFailure(elements, result.reason);
    return;
  }

  displayedSiteHost = renderNotes(elements, result.siteUrl, result.notes.filter(isValidNote), loadedMessage);
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
 * Enregistre une nouvelle note pour le site courant, puis rafraîchit la liste
 * depuis le stockage (ce qui est affiché correspond donc toujours à ce qui est
 * réellement enregistré).
 *
 * En cas d'échec, l'éditeur reste ouvert avec le texte saisi : rien n'est créé
 * tant que l'enregistrement n'a pas réussi (AC4).
 *
 * @param {{ site: HTMLElement, message: HTMLElement, list: HTMLElement }} elements
 * @param {{ close: () => void, showError: (message: string) => void }} editor
 * @param {string} content
 */
async function saveNote(elements, editor, content) {
  const result = await createNoteForActiveTab(content);

  if (!result.ok) {
    editor.showError(getCreateFailureText(result.reason));
    return;
  }

  editor.close();
  await refreshNotes(elements, NOTES_SAVED_MESSAGE);
}

/**
 * Initialise la section : câble l'éditeur de note et affiche les notes du site
 * courant.
 */
export function initNotesSection() {
  const elements = findElements("notes", ELEMENT_IDS);
  if (elements === null) {
    return;
  }

  const editor = createNoteEditor({
    trigger: elements.createButton,
    onSubmit: (content, noteEditor) => saveNote(elements, noteEditor, content),
  });

  if (editor !== null) {
    elements.createButton.addEventListener("click", () => {
      editor.open(displayedSiteHost);
    });
  }

  void loadNotes(elements);
}
