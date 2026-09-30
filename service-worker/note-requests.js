/*
 * note-requests.js — traitement des demandes concernant les notes.
 *
 * Rôle : valider la forme d'un message reçu par le contexte d'arrière-plan,
 * puis lire ou écrire les notes stockées. Rien de ce que la popup envoie n'est
 * considéré comme fiable (règle 07) : chaque demande décrit ici sa propre
 * validation, et les écritures passent par le chemin commun de
 * `note-write-pipeline.js` (URL normalisée, état d'activation, échecs du
 * stockage).
 *
 * Le routage des messages et la vérification de l'expéditeur appartiennent à
 * `service-worker.js` ; ce module ne contient que le traitement d'une demande.
 * Il est chargé aussi bien par le service worker (Chrome) que par la page
 * d'événements (Firefox, ADR-004) : aucun objet DOM n'y est utilisé.
 */

import { createNote, normalizeNoteContent } from "../shared/note.js";
import { normalizeNoteImage } from "../shared/note-image.js";
import {
  MESSAGE_TYPE,
  NOTES_CREATE_FAILURE,
  NOTES_DELETE_FAILURE,
  NOTES_EDIT_FAILURE,
  NOTES_VIEW_FAILURE,
} from "../shared/notes-messages.js";
import { addNoteForUrl, readNotesForUrl, removeNoteForUrl, updateNoteForUrl } from "../shared/notes-store.js";
import { normalizeUrl } from "../shared/url.js";
import { buildWriteFailure, writeNoteForSite } from "./note-write-pipeline.js";

/**
 * Opérations d'écriture : résultat attendu par la popup, raisons d'échec et nom
 * utilisé dans les journaux.
 */
const WRITE_OPERATIONS = {
  CREATE: { resultType: MESSAGE_TYPE.CREATE_NOTE_RESULT, failures: NOTES_CREATE_FAILURE, name: "création" },
  UPDATE: { resultType: MESSAGE_TYPE.UPDATE_NOTE_RESULT, failures: NOTES_EDIT_FAILURE, name: "modification" },
  DELETE: { resultType: MESSAGE_TYPE.DELETE_NOTE_RESULT, failures: NOTES_DELETE_FAILURE, name: "suppression" },
};

function buildViewFailure(reason) {
  return { type: MESSAGE_TYPE.VIEW_NOTES_RESULT, ok: false, reason };
}

/** Réponse d'échec d'une création. */
function buildCreateFailure(reason) {
  return buildWriteFailure(WRITE_OPERATIONS.CREATE, reason);
}

/** Réponse d'échec d'une modification. */
function buildEditFailure(reason) {
  return buildWriteFailure(WRITE_OPERATIONS.UPDATE, reason);
}

/** Réponse d'échec d'une suppression. */
function buildDeleteFailure(reason) {
  return buildWriteFailure(WRITE_OPERATIONS.DELETE, reason);
}

/**
 * @param {unknown} value
 * @returns {boolean} `true` si la valeur peut être un identifiant de note.
 */
function isNoteId(value) {
  return typeof value === "string" && value.length > 0;
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
 * Le contenu est validé ici (texte libre, `MAX_NOTE_LENGTH`), ainsi que
 * l'image facultative (voir `shared/note-image.js`), puis écrits pour l'URL
 * normalisée du site, après revérification de l'état d'activation.
 *
 * @param {{ url?: unknown, content?: unknown, image?: unknown }} message
 * @returns {Promise<object>} le résultat envoyé à la popup.
 */
async function handleCreateNoteRequest(message) {
  if (typeof message.url !== "string" || typeof message.content !== "string") {
    return buildCreateFailure(NOTES_CREATE_FAILURE.INVALID_REQUEST);
  }

  if (message.image !== undefined && message.image !== null && typeof message.image !== "string") {
    return buildCreateFailure(NOTES_CREATE_FAILURE.INVALID_REQUEST);
  }

  const content = normalizeNoteContent(message.content);
  if (content === null) {
    return buildCreateFailure(NOTES_CREATE_FAILURE.INVALID_CONTENT);
  }

  const image = normalizeNoteImage(message.image);
  if (!image.valid) {
    return buildCreateFailure(NOTES_CREATE_FAILURE.INVALID_IMAGE);
  }

  return writeNoteForSite(WRITE_OPERATIONS.CREATE, message.url, (siteUrl) =>
    addNoteForUrl(siteUrl, createNote(siteUrl, content, image.image))
  );
}

/**
 * Traite une demande de modification du contenu d'une note existante.
 *
 * La popup ne fournit que l'identifiant de la note visée, le nouveau texte et
 * la nouvelle image : les dates et le contenu réellement écrits sont maîtrisés
 * ici. `image` absent/`undefined` conserve l'image existante, `null` la
 * retire.
 *
 * @param {{ url?: unknown, id?: unknown, content?: unknown, image?: unknown }} message
 * @returns {Promise<object>} le résultat envoyé à la popup.
 */
async function handleUpdateNoteRequest(message) {
  if (typeof message.url !== "string" || !isNoteId(message.id) || typeof message.content !== "string") {
    return buildEditFailure(NOTES_EDIT_FAILURE.INVALID_REQUEST);
  }

  if (message.image !== undefined && message.image !== null && typeof message.image !== "string") {
    return buildEditFailure(NOTES_EDIT_FAILURE.INVALID_REQUEST);
  }

  const content = normalizeNoteContent(message.content);
  if (content === null) {
    return buildEditFailure(NOTES_EDIT_FAILURE.INVALID_CONTENT);
  }

  const image = normalizeNoteImage(message.image);
  if (!image.valid) {
    return buildEditFailure(NOTES_EDIT_FAILURE.INVALID_IMAGE);
  }

  return writeNoteForSite(WRITE_OPERATIONS.UPDATE, message.url, (siteUrl) =>
    updateNoteForUrl(siteUrl, message.id, content, message.image === undefined ? undefined : image.image)
  );
}

/**
 * Traite une demande de suppression d'une note.
 *
 * La suppression est définitive : l'interface demande une confirmation (AC1) et
 * la décision est revérifiée ici comme toute écriture (règle 07). Un site qui
 * n'a plus aucune note ne reste pas dans le stockage (AC4).
 *
 * @param {{ url?: unknown, id?: unknown }} message
 * @returns {Promise<object>} le résultat envoyé à la popup.
 */
async function handleDeleteNoteRequest(message) {
  if (typeof message.url !== "string" || !isNoteId(message.id)) {
    return buildDeleteFailure(NOTES_DELETE_FAILURE.INVALID_REQUEST);
  }

  return writeNoteForSite(WRITE_OPERATIONS.DELETE, message.url, (siteUrl) =>
    removeNoteForUrl(siteUrl, message.id)
  );
}

export {
  buildCreateFailure,
  buildDeleteFailure,
  buildEditFailure,
  buildViewFailure,
  handleCreateNoteRequest,
  handleDeleteNoteRequest,
  handleUpdateNoteRequest,
  handleViewNotesRequest,
};
