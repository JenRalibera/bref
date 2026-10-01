/*
 * notes-migration.js — passage des notes « par page » aux notes « par domaine ».
 *
 * L'ancien modèle rangeait les notes dans une clé par URL de page
 * (`notes:https://exemple.fr/a/b?q=1`) : une note créée sur une page
 * n'apparaissait pas sur une autre page du même site, et disparaissait dès que
 * l'URL changeait (ADR-009). Les notes vivent désormais dans une clé par
 * domaine (`notes:exemple.fr`).
 *
 * Cette reprise s'exécute une seule fois, au démarrage du contexte
 * d'arrière-plan, et n'est jamais destructive : une note héritée n'est retirée
 * de son ancienne clé qu'après avoir été écrite dans la clé du domaine. Les
 * entrées dont la forme est invalide — ou une clé dont la valeur n'est pas un
 * tableau — sont laissées telles quelles (règle 09).
 *
 * L'opération est idempotente : elle est pilotée par une clé de version, et la
 * fusion des tableaux dédoublonne les notes par identifiant. Une interruption
 * (service worker arrêté, quota atteint) est donc sans perte : au démarrage
 * suivant, la reprise repart de l'état réel du stockage.
 */

import { isValidNote } from "../shared/note.js";
import { NOTES_STORAGE_KEY_PREFIX, buildNotesStorageKey } from "../shared/notes-store.js";
import { normalizeSiteKey } from "../shared/url.js";

/** Clé de stockage portant la version du modèle de notes. */
export const NOTES_STORAGE_VERSION_KEY = "notesStorageVersion";

/** Version courante : clés par domaine. La version 1 était « une clé par page ». */
export const CURRENT_NOTES_STORAGE_VERSION = 2;

/** Préfixes d'une clé héritée : une URL de page complète. */
const LEGACY_URL_PREFIXES = ["http://", "https://"];

/**
 * Reprend les notes héritées dans les clés de domaine.
 *
 * @returns {Promise<{ migrated: boolean, sites: number, notes: number }>}
 *   `migrated` indique qu'un travail a réellement eu lieu.
 */
export async function migrateNotesToSiteKeys() {
  if ((await readStoredVersion()) === CURRENT_NOTES_STORAGE_VERSION) {
    return { migrated: false, sites: 0, notes: 0 };
  }

  const stored = await chrome.storage.local.get(null);
  const legacyKeys = Object.keys(stored).filter(isLegacyNotesKey);

  if (legacyKeys.length === 0) {
    await writeStoredVersion();
    return { migrated: false, sites: 0, notes: 0 };
  }

  const groups = groupLegacyNotes(stored, legacyKeys);
  const migratedKeys = [];
  let notes = 0;

  for (const [siteKey, group] of groups) {
    if (await writeSiteNotes(stored, siteKey, group.notes)) {
      migratedKeys.push(...group.keys);
      notes += group.notes.length;
    }
  }

  await chrome.storage.local.remove(migratedKeys);
  await writeStoredVersion();

  return { migrated: migratedKeys.length > 0, sites: groups.size, notes };
}

function isLegacyNotesKey(key) {
  if (!key.startsWith(NOTES_STORAGE_KEY_PREFIX)) {
    return false;
  }

  const suffix = key.slice(NOTES_STORAGE_KEY_PREFIX.length);

  return LEGACY_URL_PREFIXES.some((prefix) => suffix.startsWith(prefix));
}

/**
 * Rassemble les notes héritées par domaine.
 *
 * Une clé dont la valeur n'est pas un tableau, ou dont l'URL ne peut pas être
 * rattachée à un domaine, est ignorée : elle reste dans le stockage tel quel.
 *
 * @returns {Map<string, { keys: string[], notes: object[] }>}
 */
function groupLegacyNotes(stored, legacyKeys) {
  const groups = new Map();

  for (const key of legacyKeys) {
    const value = stored[key];
    const siteKey = normalizeSiteKey(key.slice(NOTES_STORAGE_KEY_PREFIX.length));

    if (siteKey === null || !Array.isArray(value)) {
      console.warn(`Bref : notes héritées conservées telles quelles pour la clé « ${key} ».`);
      continue;
    }

    if (!groups.has(siteKey)) {
      groups.set(siteKey, { keys: [], notes: [] });
    }

    const group = groups.get(siteKey);
    group.keys.push(key);
    group.notes.push(...value);
  }

  return groups;
}

/**
 * Écrit les notes héritées d'un domaine dans sa clé, en conservant les notes
 * déjà présentes.
 *
 * @returns {Promise<boolean>} `true` si l'écriture a eu lieu (les clés héritées
 *   peuvent alors être retirées).
 */
async function writeSiteNotes(stored, siteKey, legacyNotes) {
  const storageKey = buildNotesStorageKey(siteKey);
  const existingNotes = stored[storageKey];

  if (existingNotes !== undefined && !Array.isArray(existingNotes)) {
    console.warn(`Bref : reprise impossible pour « ${storageKey} », un tableau de notes était attendu.`);
    return false;
  }

  const migratedNotes = legacyNotes.map((note) => toSiteNote(note, siteKey));
  await chrome.storage.local.set({ [storageKey]: dedupeById([...migratedNotes, ...(existingNotes ?? [])]) });

  return true;
}

/**
 * Donne à une note héritée sa nouvelle forme : le domaine remplace l'URL de la
 * page. Une entrée qui n'est pas un objet est rendue inchangée.
 */
function toSiteNote(note, siteKey) {
  if (typeof note !== "object" || note === null) {
    return note;
  }

  const migratedNote = { ...note, site: siteKey };
  delete migratedNote.url;

  return migratedNote;
}

/**
 * Retire les doublons d'identifiant pour que la reprise reste idempotente. Les
 * entrées invalides, sans identifiant exploitable, sont conservées.
 */
function dedupeById(notes) {
  const seenIds = new Set();

  return notes.filter((note) => {
    if (!isValidNote(note)) {
      return true;
    }

    if (seenIds.has(note.id)) {
      return false;
    }

    seenIds.add(note.id);

    return true;
  });
}

async function readStoredVersion() {
  const stored = await chrome.storage.local.get(NOTES_STORAGE_VERSION_KEY);

  return stored[NOTES_STORAGE_VERSION_KEY];
}

async function writeStoredVersion() {
  await chrome.storage.local.set({ [NOTES_STORAGE_VERSION_KEY]: CURRENT_NOTES_STORAGE_VERSION });
}
