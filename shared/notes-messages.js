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
 * - `UPDATE_NOTE_REQUEST` : `{ type, url, id, content }` — `id` désigne la note
 *   à modifier, `content` son nouveau texte.
 * - `UPDATE_NOTE_RESULT`  : `{ type, ok: true }` en cas de succès, sinon
 *   `{ type, ok: false, reason }`.
 *
 * Senders et receivers partagent ces constantes : un seul source de vérité
 * (règle 14).
 *
 * Les raisons d'échec partagent leurs valeurs d'une opération à l'autre :
 * `UNSUPPORTED_PAGE` désigne le même échec pour une consultation, une création
 * ou une modification. Une raison est donc reconnaissable par sa chaîne, quel
 * que soit le message qui l'a produite.
 */

const INVALID_REQUEST = "INVALID_REQUEST";
const UNSUPPORTED_PAGE = "UNSUPPORTED_PAGE";
const DISABLED = "DISABLED";
const INVALID_CONTENT = "INVALID_CONTENT";
const STORE_CONFLICT = "STORE_CONFLICT";
const WRITE_FAILED = "WRITE_FAILED";

export const MESSAGE_TYPE = {
  VIEW_NOTES_REQUEST: "VIEW_NOTES_REQUEST",
  VIEW_NOTES_RESULT: "VIEW_NOTES_RESULT",
  CREATE_NOTE_REQUEST: "CREATE_NOTE_REQUEST",
  CREATE_NOTE_RESULT: "CREATE_NOTE_RESULT",
  UPDATE_NOTE_REQUEST: "UPDATE_NOTE_REQUEST",
  UPDATE_NOTE_RESULT: "UPDATE_NOTE_RESULT",
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
  DISABLED,
  INVALID_CONTENT,
  STORE_CONFLICT,
  WRITE_FAILED,
};

/**
 * Raisons possibles d'échec d'une modification.
 *
 * `NOTE_NOT_FOUND` signale que la note visée n'existe plus : elle a pu être
 * supprimée entre son affichage dans la popup et l'enregistrement.
 */
export const NOTES_EDIT_FAILURE = {
  INVALID_REQUEST,
  UNSUPPORTED_PAGE,
  DISABLED,
  INVALID_CONTENT,
  NOTE_NOT_FOUND: "NOTE_NOT_FOUND",
  STORE_CONFLICT,
  WRITE_FAILED,
};
