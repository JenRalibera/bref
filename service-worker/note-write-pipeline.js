/*
 * note-write-pipeline.js — étapes communes à toute écriture de note.
 *
 * Toute écriture (création, modification, suppression) suit le même chemin :
 * le domaine du site est extrait de l'URL, l'état d'activation est revérifié —
 * la popup n'est pas une frontière de sécurité (règle 07) — puis l'écriture est
 * exécutée et ses échecs sont traduits en raisons que la popup sait afficher
 * (règle 15).
 *
 * Réunir ce chemin en un seul endroit garantit qu'aucune opération d'écriture
 * n'oublie le verrou d'activation ni la validation de l'URL. Ce module est
 * chargé aussi bien par le service worker (Chrome) que par la page d'événements
 * (Firefox, ADR-004) : aucun objet DOM n'y est utilisé.
 */

import { readActivationEnabled } from "../shared/activation-state.js";
import { NotesStoreConflictError, NotesStoreNoteNotFoundError } from "../shared/notes-store.js";
import { normalizeSiteKey } from "../shared/url.js";

/**
 * Écriture de note : ce que la popup attend en retour et les échecs possibles.
 *
 * @typedef {object} NoteWriteOperation
 * @property {string} resultType Type du message de résultat (voir `shared/notes-messages.js`).
 * @property {object} failures Raisons d'échec de l'opération (voir `shared/notes-messages.js`).
 * @property {string} name Nom de l'opération, utilisé dans les journaux.
 */

/**
 * Réponse d'échec d'une écriture.
 *
 * @param {NoteWriteOperation} operation
 * @param {string} reason
 * @returns {object} la réponse envoyée à la popup.
 */
export function buildWriteFailure(operation, reason) {
  return { type: operation.resultType, ok: false, reason };
}

/**
 * Exécute une écriture de note pour le site (domaine) d'une URL.
 *
 * @param {NoteWriteOperation} operation
 * @param {unknown} rawUrl URL brute envoyée par la popup, jamais considérée
 *   comme fiable (règle 07).
 * @param {(siteKey: string) => Promise<void>} writeNote Écriture à effectuer,
 *   avec la clé du site (domaine) concerné.
 * @returns {Promise<object>} la réponse envoyée à la popup.
 */
export async function writeNoteForSite(operation, rawUrl, writeNote) {
  const siteKey = normalizeSiteKey(rawUrl);
  if (siteKey === null) {
    return buildWriteFailure(operation, operation.failures.UNSUPPORTED_PAGE);
  }

  try {
    const isEnabled = await readActivationEnabled();
    if (!isEnabled) {
      return buildWriteFailure(operation, operation.failures.DISABLED);
    }

    await writeNote(siteKey);
    return { type: operation.resultType, ok: true };
  } catch (error) {
    return buildWriteFailure(operation, toFailureReason(operation, error));
  }
}

/**
 * Traduit l'échec d'une écriture du stockage en raison affichable, en
 * journalisant l'incident (règles 15 et 16).
 *
 * @param {NoteWriteOperation} operation
 * @param {Error} error
 * @returns {string} la raison envoyée à la popup.
 */
function toFailureReason(operation, error) {
  if (error instanceof NotesStoreConflictError) {
    console.warn(`Bref : ${operation.name} refusée, les notes stockées pour ce site ne sont pas un tableau.`);
    return operation.failures.STORE_CONFLICT;
  }

  if (error instanceof NotesStoreNoteNotFoundError) {
    console.warn(`Bref : ${operation.name} refusée, la note visée n'existe plus.`);
    return operation.failures.NOTE_NOT_FOUND ?? operation.failures.WRITE_FAILED;
  }

  console.error(`Bref : ${operation.name} de la note impossible.`, error);
  return operation.failures.WRITE_FAILED;
}
