/*
 * notes-client.js — accès aux notes depuis la popup.
 *
 * La popup ne lit ni n'écrit jamais le stockage des notes : elle résout l'URL
 * de l'onglet actif, délègue l'opération au contexte d'arrière-plan (règle 06)
 * puis valide la réponse reçue, traitée comme une donnée non fiable (règle 07).
 *
 * Aucune fonction de ce module ne rejette : chacune renvoie un résultat
 * `{ ok: true, … }` ou `{ ok: false, reason }` directement affichable (règle 15).
 */

import {
  MESSAGE_TYPE,
  NOTES_CREATE_FAILURE,
  NOTES_EDIT_FAILURE,
  NOTES_VIEW_FAILURE,
} from "../shared/notes-messages.js";

/** Raisons d'échec d'une consultation : envoi ou lecture impossible, page non supportée. */
const VIEW_FAILURES = {
  failed: NOTES_VIEW_FAILURE.READ_FAILED,
  unsupportedPage: NOTES_VIEW_FAILURE.UNSUPPORTED_PAGE,
};

/** Raisons d'échec d'une création. */
const CREATE_FAILURES = {
  failed: NOTES_CREATE_FAILURE.WRITE_FAILED,
  unsupportedPage: NOTES_CREATE_FAILURE.UNSUPPORTED_PAGE,
};

/** Raisons d'échec d'une modification. */
const EDIT_FAILURES = {
  failed: NOTES_EDIT_FAILURE.WRITE_FAILED,
  unsupportedPage: NOTES_EDIT_FAILURE.UNSUPPORTED_PAGE,
};

/**
 * Lit l'URL de l'onglet actif.
 *
 * L'accès temporaire accordé par `activeTab` couvre l'URL de l'onglet actif au
 * moment où l'utilisateur ouvre la popup.
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
 * @param {{ failed: string, unsupportedPage: string }} failures Raisons à
 *   renvoyer selon l'échec.
 * @returns {Promise<{ ok: true, response: unknown } | { ok: false, reason: string }>}
 */
async function sendRequestForActiveTab(request, failures) {
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
 * @param {unknown} response
 * @returns {boolean} `true` si la réponse respecte le protocole de consultation.
 */
function isViewNotesResult(response) {
  if (typeof response !== "object" || response === null || response.type !== MESSAGE_TYPE.VIEW_NOTES_RESULT) {
    return false;
  }

  if (response.ok === true) {
    return typeof response.siteUrl === "string" && Array.isArray(response.notes);
  }

  return response.ok === false && typeof response.reason === "string";
}

/**
 * @param {unknown} response
 * @param {string} expectedType Type de résultat attendu.
 * @returns {boolean} `true` si la réponse respecte le protocole d'écriture.
 */
function isWriteNoteResult(response, expectedType) {
  if (typeof response !== "object" || response === null || response.type !== expectedType) {
    return false;
  }

  return response.ok === true || (response.ok === false && typeof response.reason === "string");
}

/**
 * Demande les notes du site de l'onglet actif.
 *
 * @returns {Promise<{ ok: true, siteUrl: string, notes: object[] } | { ok: false, reason: string }>}
 */
export async function requestNotesForActiveTab() {
  const sent = await sendRequestForActiveTab({ type: MESSAGE_TYPE.VIEW_NOTES_REQUEST }, VIEW_FAILURES);
  if (!sent.ok) {
    return sent;
  }

  if (!isViewNotesResult(sent.response)) {
    console.error("Bref : réponse inattendue du contexte d'arrière-plan pour la consultation des notes.");
    return { ok: false, reason: VIEW_FAILURES.failed };
  }

  const result = sent.response;
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  return { ok: true, siteUrl: result.siteUrl, notes: result.notes };
}

/**
 * Envoie une écriture de note pour le site de l'onglet actif.
 *
 * @param {object} request Demande sans URL (ajoutée au moment de l'envoi).
 * @param {string} expectedType Type de résultat attendu.
 * @param {{ failed: string, unsupportedPage: string }} failures
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
async function writeNoteForActiveTab(request, expectedType, failures) {
  const sent = await sendRequestForActiveTab(request, failures);
  if (!sent.ok) {
    return sent;
  }

  if (!isWriteNoteResult(sent.response, expectedType)) {
    console.error("Bref : réponse inattendue du contexte d'arrière-plan pour une écriture de note.");
    return { ok: false, reason: failures.failed };
  }

  return sent.response.ok ? { ok: true } : { ok: false, reason: sent.response.reason };
}

/**
 * Crée une note pour le site de l'onglet actif.
 *
 * @param {string} content Texte saisi par l'utilisateur.
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function createNoteForActiveTab(content) {
  return writeNoteForActiveTab(
    { type: MESSAGE_TYPE.CREATE_NOTE_REQUEST, content },
    MESSAGE_TYPE.CREATE_NOTE_RESULT,
    CREATE_FAILURES
  );
}

/**
 * Modifie le contenu d'une note existante du site de l'onglet actif.
 *
 * @param {string} noteId Identifiant de la note à modifier.
 * @param {string} content Nouveau texte saisi par l'utilisateur.
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function updateNoteForActiveTab(noteId, content) {
  return writeNoteForActiveTab(
    { type: MESSAGE_TYPE.UPDATE_NOTE_REQUEST, id: noteId, content },
    MESSAGE_TYPE.UPDATE_NOTE_RESULT,
    EDIT_FAILURES
  );
}
