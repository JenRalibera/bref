/*
 * note.js — forme d'une note et validation.
 *
 * Une note est stockée dans `chrome.storage.local` sous la forme :
 *
 *   {
 *     id: string,        // identifiant stable de la note
 *     url: string,       // URL normalisée du site auquel elle appartient
 *     content: string,   // contenu rédigé par l'utilisateur
 *     createdAt: string, // date ISO 8601 de création
 *     updatedAt: string  // date ISO 8601 de dernière modification
 *   }
 *
 * Toute note lue depuis le stockage est traitée comme une donnée non fiable et
 * doit passer par `isValidNote` avant d'être affichée (règles 07 et 15).
 */

/**
 * @param {unknown} value
 * @returns {boolean} `true` si la valeur respecte la forme d'une note.
 */
export function isValidNote(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    isNonEmptyString(value.id) &&
    typeof value.url === "string" &&
    typeof value.content === "string" &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
