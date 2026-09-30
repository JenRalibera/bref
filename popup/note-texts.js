/*
 * note-texts.js — textes présentés à l'utilisateur à propos des notes.
 *
 * Regroupe les messages d'échec des opérations d'écriture (enregistrement,
 * suppression) et la mise en forme du résumé d'une note, utilisés par la liste,
 * l'éditeur et la confirmation de suppression. Aucun texte n'est inséré comme du
 * HTML (règle 07).
 */

import { MAX_NOTE_LENGTH } from "../shared/note.js";
import { MAX_NOTE_IMAGE_BYTES, NOTE_IMAGE_MIME_TYPES } from "../shared/note-image.js";
import { NOTES_CREATE_FAILURE, NOTES_DELETE_FAILURE, NOTES_EDIT_FAILURE } from "../shared/notes-messages.js";

/** Limite du résumé d'une note (nom accessible d'un bouton, confirmation). */
const NOTE_EXCERPT_MAX_LENGTH = 40;

const NOTES_NOTE_NOT_FOUND_TEXT =
  "Cette note n'existe plus : elle a peut-être été supprimée. Rouvrez la popup pour actualiser la liste.";
const NOTES_INVALID_CONTENT_TEXT = `Le texte de la note est obligatoire et limité à ${MAX_NOTE_LENGTH} caractères.`;
const NOTES_SAVE_DISABLED_TEXT =
  "L'extension est désactivée : la note n'a pas pu être enregistrée. Activez-la puis réessayez.";
const NOTES_SAVE_ERROR_TEXT = "La note n'a pas pu être enregistrée. Merci de réessayer.";
const NOTES_INVALID_IMAGE_TEXT = `L'image collée ne peut pas être conservée : utilisez une image ${NOTE_IMAGE_MIME_TYPES.map((type) => type.replace("image/", "").toUpperCase()).join(", ")} de ${formatImageSizeLimit(MAX_NOTE_IMAGE_BYTES)} maximum.`;
const NOTES_DELETE_DISABLED_TEXT =
  "L'extension est désactivée : la note n'a pas pu être supprimée. Activez-la puis réessayez.";
const NOTES_DELETE_ERROR_TEXT = "La note n'a pas pu être supprimée. Merci de réessayer.";

/** Page non supportée : même texte pour une consultation et pour une écriture. */
export const NOTES_UNSUPPORTED_PAGE_TEXT =
  "Cette page ne peut pas porter de notes (page interne du navigateur ou page non autorisée).";

/**
 * Résumé d'une note sur une seule ligne : il nomme précisément les actions d'une
 * note dans un lecteur d'écran et rappelle la note visée avant une suppression
 * (règle 10).
 *
 * @param {string} content Contenu d'une note déjà validée (voir `shared/note.js`).
 * @returns {string}
 */
export function formatNoteExcerpt(content) {
  const collapsed = content.replace(/\s+/g, " ").trim();

  return collapsed.length > NOTE_EXCERPT_MAX_LENGTH
    ? `${collapsed.slice(0, NOTE_EXCERPT_MAX_LENGTH)}…`
    : collapsed;
}

/**
 * Message affiché dans l'éditeur quand un enregistrement est refusé.
 *
 * `DISABLED`, `UNSUPPORTED_PAGE` et `INVALID_CONTENT` ont la même valeur pour
 * une création et pour une modification (voir `shared/notes-messages.js`) : la
 * correspondance les compare donc aux constantes de la création, et
 * `NOTE_NOT_FOUND` — propre à la modification — à celles de la modification.
 *
 * @param {string} failureReason
 * @returns {string}
 */
export function getNoteSaveFailureText(failureReason) {
  switch (failureReason) {
    case NOTES_CREATE_FAILURE.DISABLED:
      return NOTES_SAVE_DISABLED_TEXT;
    case NOTES_CREATE_FAILURE.UNSUPPORTED_PAGE:
      return NOTES_UNSUPPORTED_PAGE_TEXT;
    case NOTES_CREATE_FAILURE.INVALID_CONTENT:
      return NOTES_INVALID_CONTENT_TEXT;
    case NOTES_CREATE_FAILURE.INVALID_IMAGE:
      return NOTES_INVALID_IMAGE_TEXT;
    case NOTES_EDIT_FAILURE.NOTE_NOT_FOUND:
      return NOTES_NOTE_NOT_FOUND_TEXT;
    default:
      return NOTES_SAVE_ERROR_TEXT;
  }
}

/**
 * @param {number} bytes
 * @returns {string} limite de poids affichable (ex. « 1 Mo »).
 */
function formatImageSizeLimit(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} Mo`;
}

/**
 * Message affiché dans la confirmation de suppression quand une suppression est
 * refusée. La correspondance utilise les constantes de la suppression, qui
 * partagent leurs valeurs avec celles des autres opérations.
 *
 * @param {string} failureReason
 * @returns {string}
 */
export function getNoteDeleteFailureText(failureReason) {
  switch (failureReason) {
    case NOTES_DELETE_FAILURE.DISABLED:
      return NOTES_DELETE_DISABLED_TEXT;
    case NOTES_DELETE_FAILURE.UNSUPPORTED_PAGE:
      return NOTES_UNSUPPORTED_PAGE_TEXT;
    case NOTES_DELETE_FAILURE.NOTE_NOT_FOUND:
      return NOTES_NOTE_NOT_FOUND_TEXT;
    default:
      return NOTES_DELETE_ERROR_TEXT;
  }
}
