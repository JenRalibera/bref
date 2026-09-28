/*
 * notes-messages.js — protocole de messages popup ⇄ service worker.
 *
 * La popup ne fait que demander ; le contexte d'arrière-plan lit ou écrit le
 * stockage et répond. Types connus :
 *
 * - `VIEW_NOTES_REQUEST`  : `{ type, url }` — URL brute de l'onglet actif.
 * - `VIEW_NOTES_RESULT`   : `{ type, ok: true, siteUrl, notes }` en cas de
 *   succès, sinon `{ type, ok: false, reason }`.
 * - `CREATE_NOTE_REQUEST` : `{ type, url, content }`.
 * - `CREATE_NOTE_RESULT`  : `{ type, ok: true }` en cas de succès, sinon
 *   `{ type, ok: false, reason }`.
 *
 * Senders et receivers partagent ces constantes : un seul source de vérité
 * (règle 14).
 */

const INVALID_REQUEST = "INVALID_REQUEST";
const UNSUPPORTED_PAGE = "UNSUPPORTED_PAGE";

export const MESSAGE_TYPE = {
  VIEW_NOTES_REQUEST: "VIEW_NOTES_REQUEST",
  VIEW_NOTES_RESULT: "VIEW_NOTES_RESULT",
  CREATE_NOTE_REQUEST: "CREATE_NOTE_REQUEST",
  CREATE_NOTE_RESULT: "CREATE_NOTE_RESULT",
};

/** Raisons possibles d'échec d'une consultation. */
export const NOTES_VIEW_FAILURE = {
  INVALID_REQUEST,
  UNSUPPORTED_PAGE,
  READ_FAILED: "READ_FAILED",
};

/** Raisons possibles d'échec d'une création. */
export const NOTES_CREATE_FAILURE = {
  INVALID_REQUEST,
  UNSUPPORTED_PAGE,
  DISABLED: "DISABLED",
  INVALID_CONTENT: "INVALID_CONTENT",
  STORE_CONFLICT: "STORE_CONFLICT",
  WRITE_FAILED: "WRITE_FAILED",
};
