/*
 * notes-client.js — accès aux notes depuis la popup.
 *
 * La popup ne lit ni n'écrit le stockage des notes : elle résout l'URL de
 * l'onglet actif, délègue l'opération au contexte d'arrière-plan (règle 06) et
 * valide la réponse reçue, traitée comme une donnée non fiable (règle 07).
 * Aucune fonction de ce module ne rejette : chacune renvoie un résultat
 * `{ ok: true, … }` ou `{ ok: false, reason }` affichable en l'état (règle 15).
 */

import {
  MESSAGE_TYPE,
  NOTES_CREATE_FAILURE,
  NOTES_DELETE_FAILURE,
  NOTES_EDIT_FAILURE,
  NOTES_VIEW_FAILURE,
} from "../shared/notes-messages.js";

/** Raisons d'échec selon la demande : échec général, puis page non supportée. */
const REQUEST_FAILURES = {
  [MESSAGE_TYPE.VIEW_NOTES_REQUEST]: { failed: NOTES_VIEW_FAILURE.READ_FAILED, unsupportedPage: NOTES_VIEW_FAILURE.UNSUPPORTED_PAGE },
  [MESSAGE_TYPE.CREATE_NOTE_REQUEST]: { failed: NOTES_CREATE_FAILURE.WRITE_FAILED, unsupportedPage: NOTES_CREATE_FAILURE.UNSUPPORTED_PAGE },
  [MESSAGE_TYPE.UPDATE_NOTE_REQUEST]: { failed: NOTES_EDIT_FAILURE.WRITE_FAILED, unsupportedPage: NOTES_EDIT_FAILURE.UNSUPPORTED_PAGE },
  [MESSAGE_TYPE.DELETE_NOTE_REQUEST]: { failed: NOTES_DELETE_FAILURE.WRITE_FAILED, unsupportedPage: NOTES_DELETE_FAILURE.UNSUPPORTED_PAGE },
};

/** Raison renvoyée si une demande inconnue atteint ce module. */
const UNKNOWN_REQUEST_REASON = "UNKNOWN_REQUEST";

/**
 * Lit l'URL de l'onglet actif : l'accès temporaire accordé par `activeTab`
 * couvre l'onglet actif au moment où l'utilisateur ouvre la popup.
 *
 * @returns {Promise<string | null>} `null` si l'URL n'est pas lisible (page
 *   interne du navigateur, boutique d'extensions, page non autorisée).
 */
async function readActiveTabUrl() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  return activeTab?.url ?? null;
}

/**
 * Envoie une demande concernant le site de l'onglet actif.
 *
 * @param {object} request Demande à compléter avec l'URL de l'onglet actif.
 * @returns {Promise<{ ok: true, response: unknown } | { ok: false, reason: string }>}
 */
async function sendRequestForActiveTab(request) {
  const failures = REQUEST_FAILURES[request.type];
  if (failures === undefined) {
    console.error(`Bref : type de demande inconnu « ${request.type} ».`);
    return { ok: false, reason: UNKNOWN_REQUEST_REASON };
  }

  let tabUrl;
  try {
    tabUrl = await readActiveTabUrl();
  } catch (error) {
    console.error("Bref : lecture de l'onglet actif impossible.", error);
    return { ok: false, reason: failures.failed };
  }

  if (tabUrl === null) {
    return { ok: false, reason: failures.unsupportedPage };
  }

  let response;
  try {
    response = await chrome.runtime.sendMessage({ ...request, url: tabUrl });
  } catch (error) {
    console.error(`Bref : envoi de la demande « ${request.type} » impossible.`, error);
    return { ok: false, reason: failures.failed };
  }

  return { ok: true, response };
}

/**
 * @param {unknown} value
 * @returns {boolean} `true` si la réponse respecte le protocole de consultation.
 */
function isViewNotesResult(value) {
  if (typeof value !== "object" || value === null || value.type !== MESSAGE_TYPE.VIEW_NOTES_RESULT) {
    return false;
  }

  if (value.ok === true) {
    return typeof value.site === "string" && Array.isArray(value.notes);
  }

  return value.ok === false && typeof value.reason === "string";
}

/**
 * @param {unknown} value
 * @param {string} expectedType Type de résultat attendu.
 * @returns {boolean} `true` si la réponse respecte le protocole d'écriture.
 */
function isWriteNoteResult(value, expectedType) {
  if (typeof value !== "object" || value === null || value.type !== expectedType) {
    return false;
  }

  return value.ok === true || (value.ok === false && typeof value.reason === "string");
}

/**
 * Demande les notes du site de l'onglet actif.
 *
 * @returns {Promise<{ ok: true, site: string, notes: object[] } | { ok: false, reason: string }>}
 */
export async function requestNotesForActiveTab() {
  const sent = await sendRequestForActiveTab({ type: MESSAGE_TYPE.VIEW_NOTES_REQUEST });
  if (!sent.ok) {
    return sent;
  }

  if (!isViewNotesResult(sent.response)) {
    console.error("Bref : réponse inattendue du contexte d'arrière-plan pour la consultation des notes.");
    return { ok: false, reason: REQUEST_FAILURES[MESSAGE_TYPE.VIEW_NOTES_REQUEST].failed };
  }

  const result = sent.response;
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  return { ok: true, site: result.site, notes: result.notes };
}

/**
 * Envoie une écriture de note pour le site de l'onglet actif.
 *
 * @param {object} request Demande sans URL (ajoutée au moment de l'envoi).
 * @param {string} expectedType Type de résultat attendu.
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
async function writeNoteForActiveTab(request, expectedType) {
  const sent = await sendRequestForActiveTab(request);
  if (!sent.ok) {
    return sent;
  }

  if (!isWriteNoteResult(sent.response, expectedType)) {
    console.error("Bref : réponse inattendue du contexte d'arrière-plan pour une écriture de note.");
    return { ok: false, reason: REQUEST_FAILURES[request.type]?.failed ?? UNKNOWN_REQUEST_REASON };
  }

  return sent.response.ok ? { ok: true } : { ok: false, reason: sent.response.reason };
}

/**
 * Crée une note pour le site de l'onglet actif.
 *
 * @param {string} content Texte saisi par l'utilisateur.
 * @param {string | null} [image] Image collée (URL de données), `null` ou
 *   absente pour une note sans image (AC2).
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function createNoteForActiveTab(content, image = null) {
  return writeNoteForActiveTab(
    { type: MESSAGE_TYPE.CREATE_NOTE_REQUEST, content, ...(image === null ? {} : { image }) },
    MESSAGE_TYPE.CREATE_NOTE_RESULT
  );
}

/**
 * Modifie le contenu d'une note existante du site de l'onglet actif.
 *
 * @param {string} noteId Identifiant de la note à modifier.
 * @param {string} content Nouveau texte saisi par l'utilisateur.
 * @param {string | null | undefined} [image] Nouvelle image : `undefined`
 *   (absente) conserve l'image existante, `null` la retire, une URL de données
 *   la remplace.
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function updateNoteForActiveTab(noteId, content, image = undefined) {
  return writeNoteForActiveTab(
    { type: MESSAGE_TYPE.UPDATE_NOTE_REQUEST, id: noteId, content, ...(image === undefined ? {} : { image }) },
    MESSAGE_TYPE.UPDATE_NOTE_RESULT
  );
}

/**
 * Supprime une note existante du site de l'onglet actif.
 *
 * @param {string} noteId Identifiant de la note à supprimer.
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function deleteNoteForActiveTab(noteId) {
  return writeNoteForActiveTab(
    { type: MESSAGE_TYPE.DELETE_NOTE_REQUEST, id: noteId },
    MESSAGE_TYPE.DELETE_NOTE_RESULT
  );
}
