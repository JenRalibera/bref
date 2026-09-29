/*
 * delete-confirm.js — confirmation de suppression d'une note de la popup.
 *
 * Une suppression détruit définitivement du contenu utilisateur : elle exige
 * une confirmation explicite (règle 09) avant d'être envoyée au contexte
 * d'arrière-plan. Le <dialog> natif assure le piégeage du focus, la fermeture
 * par Échap et le retour du focus au bouton déclencheur (règle 10).
 *
 * Ce module ne connaît ni le stockage ni la messagerie : il présente le
 * dialogue et rend compte du résultat. Il ne ferme jamais la boîte sur un
 * échec : le message d'erreur s'y affiche et laisse l'utilisateur réessayer ou
 * annuler.
 */

import { findElements } from "./find-elements.js";
import { formatNoteExcerpt, getNoteDeleteFailureText } from "./note-texts.js";

const ELEMENT_IDS = {
  dialog: "delete-confirm",
  form: "delete-confirm-form",
  message: "delete-confirm-message",
  error: "delete-confirm-error",
  confirmButton: "delete-confirm-accept",
  cancelButton: "delete-confirm-cancel",
};

const DELETE_QUESTION_PREFIX = "Supprimer la note « ";
const DELETE_QUESTION_SUFFIX = " » ? Cette action est définitive.";

/**
 * Crée la boîte de confirmation de suppression.
 *
 * @param {{ onConfirm: (note: object, dialog: { close: () => void, showError: (message: string) => void }) => Promise<void> }} options
 *   `onConfirm` reçoit la note visée et le contrôleur du dialogue ; elle doit
 *   fermer elle-même la boîte si la suppression réussit.
 * @returns {{ confirm: (note: object) => void, close: () => void, showError: (message: string) => void } | null}
 *   `null` si la popup est incomplète.
 */
export function createDeleteConfirmation({ onConfirm }) {
  const elements = findElements("confirmation de suppression", ELEMENT_IDS);
  if (elements === null) {
    return null;
  }

  let isDeleting = false;

  /** Note en attente de décision, `null` quand la boîte est fermée. */
  let pendingNote = null;

  const dialog = { confirm, close, showError };

  /**
   * Ouvre la confirmation sur la note choisie (AC1) : le résumé du contenu
   * rappelle exactement quelle note va disparaître (règle 09).
   *
   * @param {object} note Note affichée, déjà validée (voir `shared/note.js`).
   */
  function confirm(note) {
    pendingNote = note;
    elements.message.textContent = `${DELETE_QUESTION_PREFIX}${formatNoteExcerpt(note.content)}${DELETE_QUESTION_SUFFIX}`;
    hideError();
    elements.dialog.showModal();
  }

  function close() {
    elements.dialog.close();
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
    if (isDeleting || pendingNote === null) {
      return;
    }

    hideError();
    isDeleting = true;
    elements.confirmButton.disabled = true;

    try {
      await onConfirm(pendingNote, dialog);
    } catch {
      // Par contrat, `onConfirm` affiche elle-même ses échecs ; si une
      // rejection s'échappait quand même, la boîte doit rester explicable
      // (règle 15) : message générique, boîte ouverte.
      showError(getNoteDeleteFailureText("UNEXPECTED_ERROR"));
    } finally {
      isDeleting = false;
      elements.confirmButton.disabled = false;
    }
  }

  elements.form.addEventListener("submit", (event) => {
    void handleSubmit(event);
  });
  elements.cancelButton.addEventListener("click", () => {
    close();
  });
  // Pendant l'envoi, Échap ne doit pas fermer la boîte : un échec afficherait
  // son message dans une boîte déjà disparue (règle 15).
  elements.dialog.addEventListener("cancel", (event) => {
    if (isDeleting) {
      event.preventDefault();
    }
  });
  // Fermeture (bouton, Échap ou réussite) : plus rien en attente, erreurs oubliées.
  elements.dialog.addEventListener("close", () => {
    pendingNote = null;
    hideError();
  });

  return dialog;
}
