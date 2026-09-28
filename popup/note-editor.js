/*
 * note-editor.js — éditeur d'une nouvelle note dans la popup.
 *
 * L'éditeur présente le formulaire et rend compte du résultat ; il ne connaît
 * ni le stockage ni la messagerie. Tant que l'enregistrement n'a pas réussi,
 * rien n'est créé (AC4) et le texte saisi est conservé (règle 09).
 *
 * Le formulaire est placé dans le <fieldset> des actions sur les notes : quand
 * l'extension est désactivée, ses contrôles sont désactivés par le navigateur,
 * sans logique de verrouillage supplémentaire (AC5).
 */

import { MAX_NOTE_LENGTH } from "../shared/note.js";
import { findElements } from "./find-elements.js";

const NOTE_EDITOR_SITE_PREFIX = "Note pour ";
const NOTE_EDITOR_SITE_UNKNOWN_TEXT = "La note sera associée au site courant.";

const ELEMENT_IDS = {
  form: "note-editor",
  site: "note-editor-site",
  input: "note-content",
  error: "note-editor-error",
  saveButton: "save-note",
  cancelButton: "cancel-note",
};

/**
 * Crée l'éditeur de note.
 *
 * @param {{ trigger: HTMLButtonElement, onSubmit: (content: string, editor: object) => Promise<void> }} options
 *   `trigger` reçoit le focus à la fermeture ; `onSubmit` reçoit le texte saisi
 *   et le contrôleur de l'éditeur (pour afficher une erreur ou le fermer).
 * @returns {{ open: (siteHost: string | null) => void, close: () => void, showError: (message: string) => void } | null}
 *   `null` si la popup est incomplète.
 */
export function createNoteEditor({ trigger, onSubmit }) {
  const elements = findElements("éditeur de note", ELEMENT_IDS);
  if (elements === null) {
    return null;
  }

  elements.input.maxLength = MAX_NOTE_LENGTH;

  let isSaving = false;

  const editor = { open, close, showError };

  function open(siteHost) {
    elements.site.textContent =
      siteHost === null ? NOTE_EDITOR_SITE_UNKNOWN_TEXT : `${NOTE_EDITOR_SITE_PREFIX}${siteHost}`;
    hideError();

    // Rouvrir l'éditeur ne doit jamais effacer un texte non enregistré (règle 09).
    if (elements.form.hidden) {
      elements.input.value = "";
      elements.form.hidden = false;
    }

    elements.input.focus();
  }

  function close() {
    elements.form.hidden = true;
    elements.input.value = "";
    hideError();
    trigger.focus();
  }

  function showError(message) {
    elements.error.textContent = message;
    elements.error.hidden = false;
  }

  function hideError() {
    elements.error.textContent = "";
    elements.error.hidden = true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    hideError();
    isSaving = true;
    elements.saveButton.disabled = true;

    try {
      await onSubmit(elements.input.value, editor);
    } finally {
      isSaving = false;
      elements.saveButton.disabled = false;
    }
  }

  elements.form.addEventListener("submit", (event) => {
    void handleSubmit(event);
  });
  elements.cancelButton.addEventListener("click", () => {
    close();
  });

  return editor;
}
