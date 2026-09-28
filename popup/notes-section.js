/*
 * notes-section.js — section « Notes du site » de la popup.
 *
 * Elle détermine l'onglet actif, demande au service worker les notes du site
 * courant (seul lecteur du stockage, règle 06), puis affiche le résultat.
 * Le contenu des notes est inséré via `textContent` uniquement : il n'est
 * jamais interprété comme du HTML (règle 07).
 *
 * La consultation n'est pas conditionnée par l'état d'activation : les notes
 * restent consultables quand l'extension est désactivée (AC5).
 */

import { isValidNote } from "../shared/note.js";
import { MESSAGE_TYPE, NOTES_VIEW_FAILURE } from "../shared/notes-messages.js";
import { createNoteItem } from "./note-item.js";

const NOTES_LOADING_TEXT = "Chargement des notes…";
const NOTES_EMPTY_TEXT = "Aucune note pour ce site.";
const NOTES_LOAD_ERROR_TEXT = "Les notes de ce site n'ont pas pu être chargées. Merci de réessayer.";
const NOTES_UNSUPPORTED_PAGE_TEXT =
  "Cette page ne peut pas porter de notes (page interne du navigateur ou page non autorisée).";
const NOTES_SITE_LABEL_PREFIX = "Notes de ";
const NOTES_COUNT_SUFFIX = " pour ce site.";

function queryElements() {
  return {
    site: document.getElementById("notes-site"),
    message: document.getElementById("notes-message"),
    list: document.getElementById("notes-list"),
  };
}

function setMessage(elements, text, state) {
  elements.message.textContent = text;
  elements.message.dataset.state = state;
}

function setSiteLabel(elements, siteUrl) {
  const host = formatHost(siteUrl);

  elements.site.hidden = host === null;
  elements.site.textContent = host === null ? "" : `${NOTES_SITE_LABEL_PREFIX}${host}`;
}

function formatHost(siteUrl) {
  if (typeof siteUrl !== "string") {
    return null;
  }

  try {
    return new URL(siteUrl).host;
  } catch {
    return null;
  }
}

function formatNoteCount(count) {
  return `${count} note${count > 1 ? "s" : ""}${NOTES_COUNT_SUFFIX}`;
}

function renderNotes(elements, siteUrl, notes) {
  setSiteLabel(elements, siteUrl);

  if (notes.length === 0) {
    elements.list.hidden = true;
    elements.list.replaceChildren();
    setMessage(elements, NOTES_EMPTY_TEXT, "empty");
    return;
  }

  const items = document.createDocumentFragment();
  for (const note of notes) {
    items.append(createNoteItem(note));
  }

  elements.list.replaceChildren(items);
  elements.list.hidden = false;
  setMessage(elements, formatNoteCount(notes.length), "loaded");
}

/**
 * @param {string} failureReason
 * @returns {{ text: string, state: "unsupported" | "error" }}
 */
function getFailure(failureReason) {
  if (failureReason === NOTES_VIEW_FAILURE.UNSUPPORTED_PAGE) {
    return { text: NOTES_UNSUPPORTED_PAGE_TEXT, state: "unsupported" };
  }

  return { text: NOTES_LOAD_ERROR_TEXT, state: "error" };
}

function showFailure(elements, failureReason) {
  const failure = getFailure(failureReason);

  setSiteLabel(elements, null);
  elements.list.hidden = true;
  elements.list.replaceChildren();
  setMessage(elements, failure.text, failure.state);
}

/**
 * @param {unknown} response Réponse reçue du service worker (non fiable).
 * @returns {boolean} `true` si la réponse respecte le protocole attendu.
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

async function readActiveTabUrl() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  return activeTab?.url ?? null;
}

/**
 * Charge et affiche les notes du site courant.
 * Ne rejette jamais : toute erreur est signalée dans l'interface.
 *
 * @param {{ site: HTMLElement, message: HTMLElement, list: HTMLElement }} elements
 */
async function loadNotes(elements) {
  setMessage(elements, NOTES_LOADING_TEXT, "loading");
  setSiteLabel(elements, null);
  elements.list.hidden = true;
  elements.list.replaceChildren();

  let tabUrl;
  try {
    tabUrl = await readActiveTabUrl();
  } catch (error) {
    console.error("Bref : lecture de l'onglet actif impossible.", error);
    showFailure(elements, NOTES_VIEW_FAILURE.READ_FAILED);
    return;
  }

  if (tabUrl === null) {
    showFailure(elements, NOTES_VIEW_FAILURE.UNSUPPORTED_PAGE);
    return;
  }

  let response;
  try {
    response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPE.VIEW_NOTES_REQUEST, url: tabUrl });
  } catch (error) {
    console.error("Bref : demande de consultation des notes impossible.", error);
    showFailure(elements, NOTES_VIEW_FAILURE.READ_FAILED);
    return;
  }

  if (!isViewNotesResult(response)) {
    console.error("Bref : réponse inattendue du service worker pour la consultation des notes.");
    showFailure(elements, NOTES_VIEW_FAILURE.READ_FAILED);
    return;
  }

  if (!response.ok) {
    showFailure(elements, response.reason);
    return;
  }

  renderNotes(elements, response.siteUrl, response.notes.filter(isValidNote));
}

/**
 * Initialise la section et lance le chargement des notes du site courant.
 */
export function initNotesSection() {
  const elements = queryElements();
  const missingElementNames = Object.entries(elements)
    .filter(([, element]) => element === null)
    .map(([name]) => name);

  if (missingElementNames.length > 0) {
    console.error(`Bref : section notes incomplète, éléments introuvables : ${missingElementNames.join(", ")}.`);
    return;
  }

  void loadNotes(elements);
}
