/*
 * url.js — identité des pages web, utilisée comme clé de rattachement des notes.
 *
 * Une note est associée à l'URL normalisée de son site. La normalisation doit
 * être appliquée à l'identique à l'écriture et à la lecture : sinon les notes
 * d'un même site se retrouvent séparées en plusieurs clés (règle 09).
 */

/** Seules les pages web peuvent porter des notes. */
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Normalise l'URL d'une page en une clé d'identité stable.
 *
 * Règles appliquées et assumées :
 * - seuls `http:` et `https:` sont acceptés : les pages internes du navigateur
 *   (`chrome://…`), `file:`, `chrome-extension:`… ne portent pas de notes ;
 * - le fragment (`#…`) est supprimé : il ne change pas la page consultée ;
 * - la requête (`?…`) est conservée : elle peut désigner un contenu différent ;
 * - schéma et hôte sont en minuscules et le port par défaut est retiré
 *   (comportement du constructeur `URL`) ;
 * - `www.example.com` et `example.com` restent deux hôtes distincts : ils ne
 *   sont pas fusionnés, afin de ne jamais mélanger les notes de deux sites.
 *
 * @param {unknown} rawUrl
 * @returns {string | null} l'URL normalisée, ou `null` si la page ne peut pas
 *   porter de notes (URL absente, invalide ou protocole non supporté).
 */
export function normalizeUrl(rawUrl) {
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

  parsedUrl.hash = "";

  return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}`;
}
