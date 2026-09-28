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

import { MESSAGE_TYPE, NOTES_CREATE_FAILURE, NOTES_VIEW_FAILURE } from "../shared/notes-messages.js";

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
 * @returns {boolean} `true` si la réponse respecte le protocole de création.
 */
function isCreateNoteResult(response) {
  if (typeof response !== "object" || response === null || response.type !== MESSAGE_TYPE.CREATE_NOTE_RESULT) {
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
  let tabUrl;
  try {
    tabUrl = await readActiveTabUrl();
  } catch (error) {
    console.error("Bref : lecture de l'onglet actif impossible.", error);
    return { ok: false, reason: NOTES_VIEW_FAILURE.READ_FAILED };
  }

  if (tabUrl === null) {
    return { ok: false, reason: NOTES_VIEW_FAILURE.UNSUPPORTED_PAGE };
  }

  let response;
  try {
    response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPE.VIEW_NOTES_REQUEST, url: tabUrl });
  } catch (error) {
    console.error("Bref : demande de consultation des notes impossible.", error);
    return { ok: false, reason: NOTES_VIEW_FAILURE.READ_FAILED };
  }

  if (!isViewNotesResult(response)) {
    console.error("Bref : réponse inattendue du contexte d'arrière-plan pour la consultation des notes.");
    return { ok: false, reason: NOTES_VIEW_FAILURE.READ_FAILED };
  }

  if (!response.ok) {
    return { ok: false, reason: response.reason };
  }

  return { ok: true, siteUrl: response.siteUrl, notes: response.notes };
}

/**
 * Crée une note pour le site de l'onglet actif.
 *
 * @param {string} content Texte saisi par l'utilisateur.
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function createNoteForActiveTab(content) {
  let tabUrl;
  try {
    tabUrl = await readActiveTabUrl();
  } catch (error) {
    console.error("Bref : lecture de l'onglet actif impossible.", error);
    return { ok: false, reason: NOTES_CREATE_FAILURE.WRITE_FAILED };
  }

  if (tabUrl === null) {
    return { ok: false, reason: NOTES_CREATE_FAILURE.UNSUPPORTED_PAGE };
  }

  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.CREATE_NOTE_REQUEST,
      url: tabUrl,
      content,
    });
  } catch (error) {
    console.error("Bref : envoi de la note au contexte d'arrière-plan impossible.", error);
    return { ok: false, reason: NOTES_CREATE_FAILURE.WRITE_FAILED };
  }

  if (!isCreateNoteResult(response)) {
    console.error("Bref : réponse inattendue du contexte d'arrière-plan pour la création de note.");
    return { ok: false, reason: NOTES_CREATE_FAILURE.WRITE_FAILED };
  }

  return response.ok ? { ok: true } : { ok: false, reason: response.reason };
}
