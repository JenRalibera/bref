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

import { NOTES_VIEW_FAILURE } from "../shared/notes-messages.js";
import { createNoteItem, NOTE_ACTION_SELECTOR } from "./note-item.js";
import { NOTES_UNSUPPORTED_PAGE_TEXT } from "./note-texts.js";

const NOTES_LOADING_TEXT = "Chargement des notes…";
const NOTES_EMPTY_TEXT = "Aucune note pour ce site.";
const NOTES_LOAD_ERROR_TEXT = "Les notes de ce site n'ont pas pu être chargées. Merci de réessayer.";
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
 * @param {string} site Domaine du site (voir `normalizeSiteKey`).
 * @param {object[]} notes Notes déjà validées (voir `shared/note.js`).
 * @param {{ message?: { text: string, state: string } | null, canEdit?: boolean, onEdit?: ((note: object, trigger: HTMLButtonElement) => void) | null, onDelete?: ((note: object, trigger: HTMLButtonElement) => void) | null }} options
 *   `message` remplace le décompte des notes en cas de succès — y compris sur
 *   un site devenu vide, pour annoncer une suppression ; `canEdit` ouvre
 *   l'accès aux actions sur les notes (AC5) ; sans callback, l'action
 *   correspondante n'est pas proposée.
 * @returns {string | null} l'hôte affiché.
 */
export function renderNotes(
  elements,
  site,
  notes,
  { message = null, canEdit = false, onEdit = null, onDelete = null } = {}
) {
  const host = setSiteLabel(elements, site);

  if (notes.length === 0) {
    clearNotes(elements);
    const status = message ?? { text: NOTES_EMPTY_TEXT, state: "empty" };
    setMessage(elements, status.text, status.state);

    return host;
  }

  const items = document.createDocumentFragment();
  for (const note of notes) {
    items.append(createNoteItem(note, { canEdit, onEdit, onDelete }));
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
 * @param {string | null} site Domaine du site (déjà normalisé), ou `null`.
 * @returns {string | null} l'hôte affiché, ou `null` si le site est inconnu.
 */
function setSiteLabel(elements, site) {
  const host = typeof site === "string" && site.length > 0 ? site : null;

  elements.site.hidden = host === null;
  elements.site.textContent = host === null ? "" : `${NOTES_SITE_LABEL_PREFIX}${host}`;

  return host;
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
