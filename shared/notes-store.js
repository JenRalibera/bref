/*
 * notes-store.js — accès au stockage des notes (`chrome.storage.local`).
 *
 * Les notes sont réparties en une clé par site : `notes:<URL normalisée>`. La
 * consultation du site courant ne lit donc qu'une seule clé, jamais la totalité
 * des notes (règle 09).
 *
 * Ce module est destiné au service worker : la popup ne touche pas au stockage
 * des notes, elle passe par un message (règle 06).
 */

import { isValidNote } from "./note.js";

export const NOTES_STORAGE_KEY_PREFIX = "notes:";

/**
 * @param {string} normalizedUrl URL normalisée (voir `shared/url.js`).
 * @returns {string} clé de stockage des notes d'un site.
 */
export function buildNotesStorageKey(normalizedUrl) {
  return `${NOTES_STORAGE_KEY_PREFIX}${normalizedUrl}`;
}

/**
 * Lit les notes d'un site, triées de la plus ancienne à la plus récente.
 *
 * Les entrées qui ne respectent pas la forme d'une note sont ignorées et
 * signalées : elles restent dans le stockage mais ne sont pas affichées.
 *
 * @param {string} normalizedUrl
 * @returns {Promise<object[]>} les notes valides du site, éventuellement vide.
 */
export async function readNotesForUrl(normalizedUrl) {
  const storageKey = buildNotesStorageKey(normalizedUrl);
  const stored = await chrome.storage.local.get(storageKey);
  const storedNotes = stored[storageKey];

  if (storedNotes === undefined) {
    return [];
  }

  if (!Array.isArray(storedNotes)) {
    console.warn("Bref : notes ignorées pour un site : un tableau de notes était attendu.");
    return [];
  }

  const validNotes = storedNotes.filter(isValidNote);
  if (validNotes.length !== storedNotes.length) {
    console.warn(
      `Bref : ${storedNotes.length - validNotes.length} note(s) ignorée(s) car leur forme est invalide.`
    );
  }

  return sortByCreationDate(validNotes);
}

/**
 * Signale que la valeur stockée pour un site n'est pas un tableau de notes.
 *
 * L'écriture est alors refusée : remplacer une donnée de forme inconnue
 * pourrait détruire du contenu existant (règle 09).
 */
export class NotesStoreConflictError extends Error {}

/**
 * Ajoute une note aux notes déjà stockées pour un site.
 *
 * Les entrées existantes sont conservées telles quelles, y compris celles qui
 * ne respectent pas la forme d'une note : elles ne sont jamais réécrites.
 *
 * @param {string} normalizedUrl
 * @param {object} note Note valide (voir `shared/note.js`).
 * @returns {Promise<void>}
 * @throws {TypeError} si la note à enregistrer n'est pas valide.
 * @throws {NotesStoreConflictError} si la valeur stockée n'est pas un tableau.
 */
export async function addNoteForUrl(normalizedUrl, note) {
  if (!isValidNote(note)) {
    throw new TypeError("addNoteForUrl attend une note valide.");
  }

  const storageKey = buildNotesStorageKey(normalizedUrl);
  const stored = await chrome.storage.local.get(storageKey);
  const storedNotes = stored[storageKey];

  if (storedNotes !== undefined && !Array.isArray(storedNotes)) {
    throw new NotesStoreConflictError("addNoteForUrl : la valeur stockée n'est pas un tableau de notes.");
  }

  const notes = Array.isArray(storedNotes) ? storedNotes : [];

  await chrome.storage.local.set({ [storageKey]: [...notes, note] });
}

function sortByCreationDate(notes) {
  return [...notes].sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}
