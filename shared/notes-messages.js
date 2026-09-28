/*
 * notes-messages.js — protocole de messages popup ⇄ service worker.
 *
 * La popup ne fait que demander ; le service worker lit le stockage et répond.
 * Types connus :
 *
 * - `VIEW_NOTES_REQUEST` : `{ type, url }` — URL brute de l'onglet actif.
 * - `VIEW_NOTES_RESULT`  : `{ type, ok: true, siteUrl, notes }` en cas de
 *   succès, sinon `{ type, ok: false, reason }`.
 *
 * Senders et receivers partagent ces constantes : un seul source de vérité
 * (règle 14).
 */

export const MESSAGE_TYPE = {
  VIEW_NOTES_REQUEST: "VIEW_NOTES_REQUEST",
  VIEW_NOTES_RESULT: "VIEW_NOTES_RESULT",
};

/** Raisons possibles d'échec d'une demande de consultation. */
export const NOTES_VIEW_FAILURE = {
  INVALID_REQUEST: "INVALID_REQUEST",
  UNSUPPORTED_PAGE: "UNSUPPORTED_PAGE",
  READ_FAILED: "READ_FAILED",
};
