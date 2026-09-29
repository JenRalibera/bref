/*
 * service-worker.js — contexte d'arrière-plan de l'extension.
 *
 * Rôle : recevoir les demandes de la popup, vérifier qu'elles proviennent bien
 * de cette extension, puis les router vers le traitement correspondant
 * (`note-requests.js`). C'est le seul contexte qui lit et écrit les notes
 * stockées (règle 06).
 *
 * La consultation des notes est volontairement autorisée même quand l'extension
 * est désactivée ; la création, la modification et la suppression, elles, sont
 * refusées dans ce cas. Le verrouillage de l'interface n'est pas une frontière
 * de sécurité : la décision est revérifiée ici (règle 07).
 *
 * Ce fichier est déclaré à la fois en `background.service_worker` (Chrome) et
 * en `background.scripts` (Firefox, ADR-004) : il n'utilise donc que les API
 * `chrome.*` et aucun objet DOM.
 */

import {
  MESSAGE_TYPE,
  NOTES_CREATE_FAILURE,
  NOTES_DELETE_FAILURE,
  NOTES_EDIT_FAILURE,
  NOTES_VIEW_FAILURE,
} from "../shared/notes-messages.js";
import {
  buildCreateFailure,
  buildDeleteFailure,
  buildEditFailure,
  buildViewFailure,
  handleCreateNoteRequest,
  handleDeleteNoteRequest,
  handleUpdateNoteRequest,
  handleViewNotesRequest,
} from "./note-requests.js";

/**
 * @param {chrome.runtime.MessageSender} sender
 * @returns {boolean} `true` si le message provient bien de cette extension.
 */
function isTrustedSender(sender) {
  return sender.id === chrome.runtime.id;
}

/**
 * Demandes connues : chaque entrée fournit son traitement, la réponse d'échec
 * associée et la raison à utiliser si une erreur imprévue survient (le canal de
 * message ne doit jamais rester sans réponse).
 */
const REQUEST_HANDLERS = new Map([
  [
    MESSAGE_TYPE.VIEW_NOTES_REQUEST,
    {
      handle: handleViewNotesRequest,
      buildFailure: buildViewFailure,
      fallbackReason: NOTES_VIEW_FAILURE.READ_FAILED,
    },
  ],
  [
    MESSAGE_TYPE.CREATE_NOTE_REQUEST,
    {
      handle: handleCreateNoteRequest,
      buildFailure: buildCreateFailure,
      fallbackReason: NOTES_CREATE_FAILURE.WRITE_FAILED,
    },
  ],
  [
    MESSAGE_TYPE.UPDATE_NOTE_REQUEST,
    {
      handle: handleUpdateNoteRequest,
      buildFailure: buildEditFailure,
      fallbackReason: NOTES_EDIT_FAILURE.WRITE_FAILED,
    },
  ],
  [
    MESSAGE_TYPE.DELETE_NOTE_REQUEST,
    {
      handle: handleDeleteNoteRequest,
      buildFailure: buildDeleteFailure,
      fallbackReason: NOTES_DELETE_FAILURE.WRITE_FAILED,
    },
  ],
]);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isTrustedSender(sender)) {
    return false;
  }

  const handler = REQUEST_HANDLERS.get(message?.type);
  if (handler === undefined) {
    return false;
  }

  handler
    .handle(message)
    .then(sendResponse)
    .catch((error) => {
      console.error("Bref : traitement d'une demande impossible.", error);
      sendResponse(handler.buildFailure(handler.fallbackReason));
    });

  return true; // la réponse est asynchrone : garder le canal ouvert.
});
