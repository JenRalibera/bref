/*
 * notes-store.js — accès au stockage des notes (`chrome.storage.local`).
 *
 * Les notes sont réparties en une clé par **domaine** : `notes:<hôte>`. Toutes
 * les pages d'un même site partagent donc la même clé, et la consultation du
 * site courant ne lit qu'une seule clé, jamais la totalité des notes (règle 09).
 *
 * Les clés héritées de l'ancien modèle (une clé par URL de page,
 * `notes:https://…`) sont reprises une fois au démarrage par
 * `service-worker/notes-migration.js` (ADR-009).
 *
 * Ce module est destiné au service worker : la popup ne touche pas au stockage
 * des notes, elle passe par un message (règle 06).
 */

import { isValidNote, updateNoteContent } from "./note.js";

export const NOTES_STORAGE_KEY_PREFIX = "notes:";

/**
 * @param {string} siteKey Domaine du site (voir `normalizeSiteKey`).
 * @returns {string} clé de stockage des notes d'un site.
 */
export function buildNotesStorageKey(siteKey) {
  return `${NOTES_STORAGE_KEY_PREFIX}${siteKey}`;
}

/**
 * Lit les notes d'un site, triées de la plus ancienne à la plus récente.
 *
 * Les entrées qui ne respectent pas la forme d'une note sont ignorées et
 * signalées : elles restent dans le stockage mais ne sont pas affichées.
 *
 * @param {string} siteKey
 * @returns {Promise<object[]>} les notes valides du site, éventuellement vide.
 */
export async function readNotesForSite(siteKey) {
  const storageKey = buildNotesStorageKey(siteKey);
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
 * Signale que la note visée par une modification ou une suppression n'existe
 * plus dans le site.
 *
 * Elle a pu être supprimée entre son affichage dans la popup et l'opération
 * demandée.
 */
export class NotesStoreNoteNotFoundError extends Error {}

/**
 * Ajoute une note aux notes déjà stockées pour un site.
 *
 * Les entrées existantes sont conservées telles quelles, y compris celles qui
 * ne respectent pas la forme d'une note : elles ne sont jamais réécrites.
 *
 * @param {string} siteKey
 * @param {object} note Note valide (voir `shared/note.js`).
 * @returns {Promise<void>}
 * @throws {TypeError} si la note à enregistrer n'est pas valide.
 * @throws {NotesStoreConflictError} si la valeur stockée n'est pas un tableau.
 */
export async function addNoteForSite(siteKey, note) {
  if (!isValidNote(note)) {
    throw new TypeError("addNoteForSite attend une note valide.");
  }

  const storageKey = buildNotesStorageKey(siteKey);
  const stored = await chrome.storage.local.get(storageKey);
  const storedNotes = stored[storageKey];

  if (storedNotes !== undefined && !Array.isArray(storedNotes)) {
    throw new NotesStoreConflictError("addNoteForSite : la valeur stockée n'est pas un tableau de notes.");
  }

  const notes = Array.isArray(storedNotes) ? storedNotes : [];

  await chrome.storage.local.set({ [storageKey]: [...notes, note] });
}

/**
 * Remplace le contenu d'une note existante d'un site.
 *
 * Seule la note visée est réécrite, à sa position d'origine : les autres
 * entrées du site sont conservées telles quelles, y compris celles qui ne
 * respectent pas la forme d'une note (règle 09).
 *
 * @param {string} siteKey
 * @param {string} noteId Identifiant de la note à modifier.
 * @param {string} content Nouveau contenu déjà validé (voir `normalizeNoteContent`).
 * @param {string | null} [image] Nouvelle image déjà validée : `undefined`
 *   conserve l'image existante, `null` la retire, une URL de données la
 *   remplace (voir `shared/note-image.js`).
 * @returns {Promise<void>}
 * @throws {NotesStoreConflictError} si la valeur stockée n'est pas un tableau.
 * @throws {NotesStoreNoteNotFoundError} si aucune note du site ne porte cet
 *   identifiant.
 */
export async function updateNoteForSite(siteKey, noteId, content, image = undefined) {
  const storageKey = buildNotesStorageKey(siteKey);
  const stored = await chrome.storage.local.get(storageKey);
  const storedNotes = stored[storageKey];

  if (storedNotes !== undefined && !Array.isArray(storedNotes)) {
    throw new NotesStoreConflictError("updateNoteForSite : la valeur stockée n'est pas un tableau de notes.");
  }

  const notes = Array.isArray(storedNotes) ? storedNotes : [];
  const noteIndex = notes.findIndex((note) => isValidNote(note) && note.id === noteId);

  if (noteIndex === -1) {
    throw new NotesStoreNoteNotFoundError("updateNoteForSite : aucune note ne porte cet identifiant.");
  }

  const updatedNotes = [...notes];
  updatedNotes[noteIndex] = updateNoteContent(notes[noteIndex], content, image);

  await chrome.storage.local.set({ [storageKey]: updatedNotes });
}

/**
 * Supprime une note d'un site.
 *
 * Seule la note visée disparaît : les autres entrées du site sont conservées
 * telles quelles, y compris celles qui ne respectent pas la forme d'une note
 * (règle 09). Quand la note supprimée était la dernière du site, la clé de
 * stockage est retirée : un site sans note n'existe pas, la vue globale des
 * sites reste donc exacte (AC4).
 *
 * @param {string} siteKey
 * @param {string} noteId Identifiant de la note à supprimer.
 * @returns {Promise<void>}
 * @throws {NotesStoreConflictError} si la valeur stockée n'est pas un tableau.
 * @throws {NotesStoreNoteNotFoundError} si aucune note du site ne porte cet
 *   identifiant.
 */
export async function removeNoteForSite(siteKey, noteId) {
  const storageKey = buildNotesStorageKey(siteKey);
  const stored = await chrome.storage.local.get(storageKey);
  const storedNotes = stored[storageKey];

  if (storedNotes !== undefined && !Array.isArray(storedNotes)) {
    throw new NotesStoreConflictError("removeNoteForSite : la valeur stockée n'est pas un tableau de notes.");
  }

  const notes = Array.isArray(storedNotes) ? storedNotes : [];
  const noteIndex = notes.findIndex((note) => isValidNote(note) && note.id === noteId);

  if (noteIndex === -1) {
    throw new NotesStoreNoteNotFoundError("removeNoteForSite : aucune note ne porte cet identifiant.");
  }

  const remainingNotes = notes.toSpliced(noteIndex, 1);
  if (remainingNotes.length === 0) {
    await chrome.storage.local.remove(storageKey);
    return;
  }

  await chrome.storage.local.set({ [storageKey]: remainingNotes });
}

function sortByCreationDate(notes) {
  return [...notes].sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}
