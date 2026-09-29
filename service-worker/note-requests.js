/*
 * note-requests.js — traitement des demandes concernant les notes.
 *
 * Rôle : valider la forme d'un message reçu par le contexte d'arrière-plan,
 * normaliser l'URL du site, valider le contenu, vérifier l'état d'activation,
 * puis lire ou écrire les notes stockées. Rien de ce que la popup envoie n'est
 * considéré comme fiable (règle 07).
 *
 * Le routage des messages et la vérification de l'expéditeur appartiennent à
 * `service-worker.js` ; ce module ne contient que le traitement d'une demande.
 * Il est chargé aussi bien par le service worker (Chrome) que par la page
 * d'événements (Firefox, ADR-004) : aucun objet DOM n'y est utilisé.
 */

import { readActivationEnabled } from "../shared/activation-state.js";
import { createNote, normalizeNoteContent } from "../shared/note.js";
import {
  MESSAGE_TYPE,
  NOTES_CREATE_FAILURE,
  NOTES_EDIT_FAILURE,
  NOTES_VIEW_FAILURE,
} from "../shared/notes-messages.js";
import {
  addNoteForUrl,
  NotesStoreConflictError,
  NotesStoreNoteNotFoundError,
  readNotesForUrl,
  updateNoteForUrl,
} from "../shared/notes-store.js";
import { normalizeUrl } from "../shared/url.js";

function buildViewFailure(reason) {
  return { type: MESSAGE_TYPE.VIEW_NOTES_RESULT, ok: false, reason };
}

function buildCreateFailure(reason) {
  return { type: MESSAGE_TYPE.CREATE_NOTE_RESULT, ok: false, reason };
}

function buildEditFailure(reason) {
  return { type: MESSAGE_TYPE.UPDATE_NOTE_RESULT, ok: false, reason };
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
 * Traite une demande de modification du contenu d'une note existante.
 *
 * La popup ne fournit que l'identifiant de la note visée et le nouveau texte :
 * les dates et le contenu réellement écrits sont maîtrisés ici (règle 07).
 * L'état d'activation est revérifié, comme pour la création.
 *
 * @param {{ url?: unknown, id?: unknown, content?: unknown }} message
 * @returns {Promise<object>} le résultat envoyé à la popup.
 */
async function handleUpdateNoteRequest(message) {
  if (
    typeof message.url !== "string" ||
    typeof message.id !== "string" ||
    message.id.length === 0 ||
    typeof message.content !== "string"
  ) {
    return buildEditFailure(NOTES_EDIT_FAILURE.INVALID_REQUEST);
  }

  const siteUrl = normalizeUrl(message.url);
  if (siteUrl === null) {
    return buildEditFailure(NOTES_EDIT_FAILURE.UNSUPPORTED_PAGE);
  }

  const content = normalizeNoteContent(message.content);
  if (content === null) {
    return buildEditFailure(NOTES_EDIT_FAILURE.INVALID_CONTENT);
  }

  try {
    const isEnabled = await readActivationEnabled();
    if (!isEnabled) {
      return buildEditFailure(NOTES_EDIT_FAILURE.DISABLED);
    }

    await updateNoteForUrl(siteUrl, message.id, content);
    return { type: MESSAGE_TYPE.UPDATE_NOTE_RESULT, ok: true };
  } catch (error) {
    if (error instanceof NotesStoreConflictError) {
      console.warn("Bref : modification refusée, les notes stockées pour ce site ne sont pas un tableau.");
      return buildEditFailure(NOTES_EDIT_FAILURE.STORE_CONFLICT);
    }

    if (error instanceof NotesStoreNoteNotFoundError) {
      console.warn("Bref : modification refusée, la note visée n'existe plus.");
      return buildEditFailure(NOTES_EDIT_FAILURE.NOTE_NOT_FOUND);
    }

    console.error("Bref : modification de la note impossible.", error);
    return buildEditFailure(NOTES_EDIT_FAILURE.WRITE_FAILED);
  }
}

export {
  buildCreateFailure,
  buildEditFailure,
  buildViewFailure,
  handleCreateNoteRequest,
  handleUpdateNoteRequest,
  handleViewNotesRequest,
};
