/*
 * notes-view.js — affichage de la section « Notes du site ».
 *
 * Ce module ne connaît ni le stockage ni la messagerie : il reçoit des données
 * déjà validées et les rend. Le contenu des notes est inséré via `textContent`
 * uniquement : il n'est jamais interprété comme du HTML (règle 07).
 *
 * Les fonctions de rendu renvoient l'hôte du site affiché (ou `null`) : la
 * section s'en sert pour situer la note en cours de création ou de modification.
 */

import { MAX_NOTE_LENGTH } from "../shared/note.js";
import { NOTES_CREATE_FAILURE, NOTES_EDIT_FAILURE, NOTES_VIEW_FAILURE } from "../shared/notes-messages.js";
import { createNoteItem, NOTE_ACTION_SELECTOR } from "./note-item.js";

const NOTES_LOADING_TEXT = "Chargement des notes…";
const NOTES_EMPTY_TEXT = "Aucune note pour ce site.";
const NOTES_LOAD_ERROR_TEXT = "Les notes de ce site n'ont pas pu être chargées. Merci de réessayer.";
const NOTES_UNSUPPORTED_PAGE_TEXT =
  "Cette page ne peut pas porter de notes (page interne du navigateur ou page non autorisée).";
const NOTES_DISABLED_TEXT =
  "L'extension est désactivée : la note n'a pas pu être enregistrée. Activez-la puis réessayez.";
const NOTES_SAVE_ERROR_TEXT = "La note n'a pas pu être enregistrée. Merci de réessayer.";
const NOTES_INVALID_CONTENT_TEXT = `Le texte de la note est obligatoire et limité à ${MAX_NOTE_LENGTH} caractères.`;
const NOTES_NOTE_NOT_FOUND_TEXT =
  "Cette note n'existe plus : elle a peut-être été supprimée. Rouvrez la popup pour actualiser la liste.";
const NOTES_SITE_LABEL_PREFIX = "Notes de ";
const NOTES_COUNT_SUFFIX = " pour ce site.";

/**
 * Affiche l'état de chargement : aucune note, aucun site annoncé.
 *
 * @param {{ site: HTMLElement, message: HTMLElement, list: HTMLElement }} elements
 * @returns {null} aucun site affiché.
 */
export function renderLoading(elements) {
  setMessage(elements, NOTES_LOADING_TEXT, "loading");
  clearNotes(elements);

  return setSiteLabel(elements, null);
}

/**
 * Affiche les notes d'un site.
 *
 * @param {{ site: HTMLElement, message: HTMLElement, list: HTMLElement }} elements
 * @param {string} siteUrl URL normalisée du site.
 * @param {object[]} notes Notes déjà validées (voir `shared/note.js`).
 * @param {{ message?: { text: string, state: string } | null, canEdit?: boolean, onEdit?: ((note: object, trigger: HTMLButtonElement) => void) | null }} options
 *   `message` remplace le décompte des notes en cas de succès ; `canEdit` ouvre
 *   l'accès aux actions sur les notes (AC5) ; sans `onEdit`, aucune action n'est
 *   proposée.
 * @returns {string | null} l'hôte affiché.
 */
export function renderNotes(elements, siteUrl, notes, { message = null, canEdit = false, onEdit = null } = {}) {
  const host = setSiteLabel(elements, siteUrl);

  if (notes.length === 0) {
    clearNotes(elements);
    setMessage(elements, NOTES_EMPTY_TEXT, "empty");

    return host;
  }

  const items = document.createDocumentFragment();
  for (const note of notes) {
    items.append(createNoteItem(note, { canEdit, onEdit }));
  }

  elements.list.replaceChildren(items);
  elements.list.hidden = false;

  const loadedMessage = message ?? { text: formatNoteCount(notes.length), state: "loaded" };
  setMessage(elements, loadedMessage.text, loadedMessage.state);

  return host;
}

/**
 * Ouvre ou ferme l'accès aux actions portées par les notes affichées (AC5).
 *
 * Appelée quand l'état d'activation change ou vient d'être lu : les boutons déjà
 * présents sont désactivés sans re-rendre la liste.
 *
 * @param {{ list: HTMLElement }} elements
 * @param {boolean} isEnabled
 */
export function setNoteActionsEnabled(elements, isEnabled) {
  for (const action of elements.list.querySelectorAll(NOTE_ACTION_SELECTOR)) {
    action.disabled = !isEnabled;
  }
}

/**
 * Affiche un échec de consultation : la liste est vidée et aucun site n'est
 * annoncé.
 *
 * @param {{ site: HTMLElement, message: HTMLElement, list: HTMLElement }} elements
 * @param {string} failureReason
 * @returns {null} aucun site affiché.
 */
export function renderViewFailure(elements, failureReason) {
  const failure = getViewFailure(failureReason);

  clearNotes(elements);
  setMessage(elements, failure.text, failure.state);

  return setSiteLabel(elements, null);
}

/**
 * Message affiché dans l'éditeur quand un enregistrement est refusé.
 *
 * `DISABLED`, `UNSUPPORTED_PAGE` et `INVALID_CONTENT` ont la même valeur pour
 * une création et pour une modification (voir `shared/notes-messages.js`) : la
 * correspondance les compare donc aux constantes de la création, et
 * `NOTE_NOT_FOUND` — propre à la modification — à celles de la modification.
 *
 * @param {string} failureReason
 * @returns {string}
 */
export function getNoteSaveFailureText(failureReason) {
  switch (failureReason) {
    case NOTES_CREATE_FAILURE.DISABLED:
      return NOTES_DISABLED_TEXT;
    case NOTES_CREATE_FAILURE.UNSUPPORTED_PAGE:
      return NOTES_UNSUPPORTED_PAGE_TEXT;
    case NOTES_CREATE_FAILURE.INVALID_CONTENT:
      return NOTES_INVALID_CONTENT_TEXT;
    case NOTES_EDIT_FAILURE.NOTE_NOT_FOUND:
      return NOTES_NOTE_NOT_FOUND_TEXT;
    default:
      return NOTES_SAVE_ERROR_TEXT;
  }
}

function setMessage(elements, text, state) {
  elements.message.textContent = text;
  elements.message.dataset.state = state;
}

function clearNotes(elements) {
  elements.list.hidden = true;
  elements.list.replaceChildren();
}

/**
 * @param {{ site: HTMLElement }} elements
 * @param {string | null} siteUrl
 * @returns {string | null} l'hôte affiché, ou `null` si le site est inconnu.
 */
function setSiteLabel(elements, siteUrl) {
  const host = formatHost(siteUrl);

  elements.site.hidden = host === null;
  elements.site.textContent = host === null ? "" : `${NOTES_SITE_LABEL_PREFIX}${host}`;

  return host;
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

/**
 * @param {string} failureReason
 * @returns {{ text: string, state: "unsupported" | "error" }}
 */
function getViewFailure(failureReason) {
  if (failureReason === NOTES_VIEW_FAILURE.UNSUPPORTED_PAGE) {
    return { text: NOTES_UNSUPPORTED_PAGE_TEXT, state: "unsupported" };
  }

  return { text: NOTES_LOAD_ERROR_TEXT, state: "error" };
}
