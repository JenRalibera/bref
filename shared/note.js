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
 * Longueur maximale du contenu d'une note.
 *
 * Cette constante est partagée par le champ de saisie (`maxlength`) et par la
 * validation du service worker : la limite affichée ne peut donc pas diverger
 * de la limite appliquée au stockage.
 */
export const MAX_NOTE_LENGTH = 5000;

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

/**
 * Valide et normalise le contenu saisi pour une note.
 *
 * Le texte est libre (caractères spéciaux, emojis, retours à la ligne) ; seuls
 * les espaces de bord sont retirés.
 *
 * @param {unknown} value
 * @returns {string | null} le contenu nettoyé, ou `null` si le texte est
 *   absent, vide ou trop long.
 */
export function normalizeNoteContent(value) {
  if (typeof value !== "string") {
    return null;
  }

  const content = value.trim();
  if (content.length === 0 || content.length > MAX_NOTE_LENGTH) {
    return null;
  }

  return content;
}

/**
 * Construit une nouvelle note pour un site.
 *
 * L'identifiant et les dates sont produits ici, jamais par l'appelant, pour
 * qu'une note enregistrée respecte toujours `isValidNote`.
 *
 * @param {string} siteUrl URL normalisée du site (voir `shared/url.js`).
 * @param {string} content Contenu déjà validé (voir `normalizeNoteContent`).
 * @returns {{ id: string, url: string, content: string, createdAt: string, updatedAt: string }}
 */
export function createNote(siteUrl, content) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    url: siteUrl,
    content,
    createdAt: now,
    updatedAt: now,
  };
}
