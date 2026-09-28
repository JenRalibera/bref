/*
 * service-worker.js — service worker de l'extension.
 *
 * Rôle : seul point d'accès aux notes stockées. La popup envoie une demande ;
 * ce service worker vérifie l'expéditeur et la forme du message, lit
 * `chrome.storage.local` puis renvoie les notes du site courant (règle 06).
 *
 * La consultation est volontairement autorisée même quand l'extension est
 * désactivée (AC5). La vérification de l'état d'activation concernera les
 * créations, modifications et suppressions : elles devront elles aussi passer
 * par ce service worker pour être refusées aux notes inaccessibles (règle 07).
 *
 * Le service worker n'a pas de DOM : il n'utilise que les API `chrome.*`.
 */

import { MESSAGE_TYPE, NOTES_VIEW_FAILURE } from "../shared/notes-messages.js";
import { readNotesForUrl } from "../shared/notes-store.js";
import { normalizeUrl } from "../shared/url.js";

/**
 * @param {chrome.runtime.MessageSender} sender
 * @returns {boolean} `true` si le message provient bien de cette extension.
 */
function isTrustedSender(sender) {
  return sender.id === chrome.runtime.id;
}

function buildFailureResult(reason) {
  return { type: MESSAGE_TYPE.VIEW_NOTES_RESULT, ok: false, reason };
}

/**
 * Traite une demande de consultation des notes du site courant.
 *
 * @param {{ url?: unknown }} message
 * @returns {Promise<object>} le résultat envoyé à la popup.
 */
async function handleViewNotesRequest(message) {
  if (typeof message.url !== "string") {
    return buildFailureResult(NOTES_VIEW_FAILURE.INVALID_REQUEST);
  }

  const siteUrl = normalizeUrl(message.url);
  if (siteUrl === null) {
    return buildFailureResult(NOTES_VIEW_FAILURE.UNSUPPORTED_PAGE);
  }

  try {
    const notes = await readNotesForUrl(siteUrl);
    return { type: MESSAGE_TYPE.VIEW_NOTES_RESULT, ok: true, siteUrl, notes };
  } catch (error) {
    console.error("Bref : lecture des notes du site impossible.", error);
    return buildFailureResult(NOTES_VIEW_FAILURE.READ_FAILED);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isTrustedSender(sender) || message?.type !== MESSAGE_TYPE.VIEW_NOTES_REQUEST) {
    return false;
  }

  handleViewNotesRequest(message)
    .then(sendResponse)
    .catch((error) => {
      console.error("Bref : traitement de la demande de consultation impossible.", error);
      sendResponse(buildFailureResult(NOTES_VIEW_FAILURE.READ_FAILED));
    });

  return true; // la réponse est asynchrone : garder le canal ouvert.
});
