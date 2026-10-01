/*
 * url.js — identité d'un site web, utilisée comme clé de rattachement des notes.
 *
 * Une note appartient à un **domaine** (hôte), pas à une page : toutes les pages
 * d'un même site partagent donc les mêmes notes. C'est le comportement attendu,
 * car l'URL d'une page change souvent sans changer de site (requête de filtre,
 * paramètre de suivi, navigation interne d'une application web) ; rattacher les
 * notes à l'URL complète les faisait « disparaître » dès que l'URL changeait,
 * et séparait en plusieurs clés les notes d'un même site (règle 09).
 *
 * Les clés de stockage sont donc `notes:<hôte>` (voir `shared/notes-store.js`).
 */

/** Seuls les sites web peuvent porter des notes. */
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Normalise l'URL d'une page en la clé du site (domaine) auquel elle appartient.
 *
 * Règles appliquées et assumées :
 * - seuls `http:` et `https:` sont acceptés : les pages internes du navigateur
 *   (`chrome://…`), `file:`, `chrome-extension:`… ne portent pas de notes ;
 * - seule l'hôte est retenue : le chemin, la requête (`?…`) et le fragment
 *   (`#…`) sont ignorés, car ils changent au fil de la navigation sans changer
 *   de site ;
 * - `http` et `https` d'un même hôte partagent donc leurs notes ;
 * - l'hôte est en minuscules et le port par défaut est retiré (comportement du
 *   constructeur `URL`) ; un port explicite fait partie de la clé ;
 * - `www.example.com` et `example.com` restent deux sites distincts : les
 *   fusionner pourrait attribuer une note au mauvais site.
 *
 * @param {unknown} rawUrl
 * @returns {string | null} la clé du site (hôte), ou `null` si la page ne peut
 *   pas porter de notes (URL absente, invalide ou protocole non supporté).
 */
export function normalizeSiteKey(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!SUPPORTED_PROTOCOLS.has(parsedUrl.protocol)) {
    return null;
  }

  return parsedUrl.host;
}
