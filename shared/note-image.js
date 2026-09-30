/*
 * note-image.js — image facultative d'une note.
 *
 * Une note peut contenir au plus une image (AC2/AC3), collée depuis le
 * presse-papiers puis conservée avec la note à l'enregistrement (AC4). Elle
 * est stockée comme une URL de données (`data:`) dans la note elle-même : la
 * lecture d'un site reste donc la lecture d'une seule clé (règle 09) et aucun
 * nouveau stockage n'est introduit.
 *
 * Les limites protègent le quota partagé de `chrome.storage.local` (~5 Mo) :
 * une seule note ne doit pas rendre toute écriture impossible (règle 15).
 * `image/svg+xml` est exclu : un SVG peut embarquer du script et une note est
 * une donnée non fiable (règle 07).
 *
 * Ce module ne touche à aucun DOM : il est chargé par la popup comme par le
 * contexte d'arrière-plan (service worker Chrome, page d'événements Firefox).
 */

/**
 * Types d'images acceptés : décodables en `<img>`, sans script embarqué.
 */
export const NOTE_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/**
 * Poids maximal d'une image décodée, en octets (1 Mo).
 */
export const MAX_NOTE_IMAGE_BYTES = 1024 * 1024;

/** Préfixe attendu d'une image de note stockée. */
const NOTE_IMAGE_DATA_URL_PREFIX = "data:image/";

const NOTE_IMAGE_DATA_URL_PATTERN = /^data:(image\/(png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+=*)$/;

/**
 * @param {unknown} value
 * @returns {boolean} `true` si la valeur est une image de note stockable :
 *   `null` (pas d'image, AC2), ou une URL de données d'un type accepté dont le
 *   poids décodé estimé ne dépasse pas `MAX_NOTE_IMAGE_BYTES`.
 */
export function isValidNoteImage(value) {
  return normalizeNoteImage(value).valid;
}

/**
 * Valide et normalise l'image reçue pour une note.
 *
 * `undefined` (message d'une ancienne popup) vaut absence d'image : les notes
 * sans image restent enregistrables (AC2).
 *
 * @param {unknown} value
 * @returns {{ valid: boolean, image: string | null }} `image` vaut la URL de
 *   données à stocker, ou `null` quand la note n'a pas d'image.
 */
export function normalizeNoteImage(value) {
  if (value === null || value === undefined) {
    return { valid: true, image: null };
  }

  if (typeof value !== "string" || !value.startsWith(NOTE_IMAGE_DATA_URL_PREFIX)) {
    return { valid: false, image: null };
  }

  const match = NOTE_IMAGE_DATA_URL_PATTERN.exec(value);
  if (match === null || !NOTE_IMAGE_MIME_TYPES.includes(match[1])) {
    return { valid: false, image: null };
  }

  if (estimateDecodedBytes(match[3]) > MAX_NOTE_IMAGE_BYTES) {
    return { valid: false, image: null };
  }

  return { valid: true, image: value };
}

/**
 * Estime le poids décodé d'un corps base64 sans le décoder.
 *
 * @param {string} base64
 * @returns {number} octets estimés.
 */
export function estimateDecodedBytes(base64) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;

  return Math.floor((base64.length * 3) / 4) - padding;
}
