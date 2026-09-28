/*
 * service-worker.js — contexte d'arrière-plan de l'extension.
 *
 * Rôle : seul point d'accès aux notes stockées. La popup envoie une demande ;
 * ce contexte vérifie l'expéditeur, le type et la forme du message, lit ou
 * écrit `chrome.storage.local` puis répond (règle 06).
 *
 * La consultation des notes est volontairement autorisée même quand l'extension
 * est désactivée ; la création, elle, est refusée dans ce cas. Le verrouillage
 * de l'interface n'est pas une frontière de sécurité : la décision est
 * revérifiée ici (règle 07).
 *
 * Ce fichier est déclaré à la fois en `background.service_worker` (Chrome) et
 * en `background.scripts` (Firefox, ADR-004) : il n'utilise donc que les API
 * `chrome.*` et aucun objet DOM.
 */

import { readActivationEnabled } from "../shared/activation-state.js";
import { createNote, normalizeNoteContent } from "../shared/note.js";
import {
  MESSAGE_TYPE,
  NOTES_CREATE_FAILURE,
  NOTES_VIEW_FAILURE,
} from "../shared/notes-messages.js";
import { addNoteForUrl, NotesStoreConflictError, readNotesForUrl } from "../shared/notes-store.js";
import { normalizeUrl } from "../shared/url.js";

/**
 * @param {chrome.runtime.MessageSender} sender
 * @returns {boolean} `true` si le message provient bien de cette extension.
 */
function isTrustedSender(sender) {
  return sender.id === chrome.runtime.id;
}

function buildViewFailure(reason) {
  return { type: MESSAGE_TYPE.VIEW_NOTES_RESULT, ok: false, reason };
}

function buildCreateFailure(reason) {
  return { type: MESSAGE_TYPE.CREATE_NOTE_RESULT, ok: false, reason };
}

/**
 * Traite une demande de consultation des notes du site courant.
 *
 * @param {{ url?: unknown }} message
 * @returns {Promise<object>} le résultat envoyé à la popup.
 */
async function handleViewNotesRequest(message) {
  if (typeof message.url !== "string") {
    return buildViewFailure(NOTES_VIEW_FAILURE.INVALID_REQUEST);
  }

  const siteUrl = normalizeUrl(message.url);
  if (siteUrl === null) {
    return buildViewFailure(NOTES_VIEW_FAILURE.UNSUPPORTED_PAGE);
  }

  try {
    const notes = await readNotesForUrl(siteUrl);
    return { type: MESSAGE_TYPE.VIEW_NOTES_RESULT, ok: true, siteUrl, notes };
  } catch (error) {
    console.error("Bref : lecture des notes du site impossible.", error);
    return buildViewFailure(NOTES_VIEW_FAILURE.READ_FAILED);
  }
}

/**
 * Traite une demande de création de note.
 *
 * L'état d'activation est revérifié ici et le contenu est validé de nouveau :
 * ce que la popup envoie n'est jamais considéré comme fiable (règle 07).
 *
 * @param {{ url?: unknown, content?: unknown }} message
 * @returns {Promise<object>} le résultat envoyé à la popup.
 */
async function handleCreateNoteRequest(message) {
  if (typeof message.url !== "string" || typeof message.content !== "string") {
    return buildCreateFailure(NOTES_CREATE_FAILURE.INVALID_REQUEST);
  }

  const siteUrl = normalizeUrl(message.url);
  if (siteUrl === null) {
    return buildCreateFailure(NOTES_CREATE_FAILURE.UNSUPPORTED_PAGE);
  }

  const content = normalizeNoteContent(message.content);
  if (content === null) {
    return buildCreateFailure(NOTES_CREATE_FAILURE.INVALID_CONTENT);
  }

  try {
    const isEnabled = await readActivationEnabled();
    if (!isEnabled) {
      return buildCreateFailure(NOTES_CREATE_FAILURE.DISABLED);
    }

    await addNoteForUrl(siteUrl, createNote(siteUrl, content));
    return { type: MESSAGE_TYPE.CREATE_NOTE_RESULT, ok: true };
  } catch (error) {
    if (error instanceof NotesStoreConflictError) {
      console.warn("Bref : création refusée, les notes stockées pour ce site ne sont pas un tableau.");
      return buildCreateFailure(NOTES_CREATE_FAILURE.STORE_CONFLICT);
    }

    console.error("Bref : enregistrement de la note impossible.", error);
    return buildCreateFailure(NOTES_CREATE_FAILURE.WRITE_FAILED);
  }
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
