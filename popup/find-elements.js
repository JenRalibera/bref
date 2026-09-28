/*
 * find-elements.js — récupération des éléments DOM de la popup.
 *
 * Un identifiant absent signale une popup incomplète : l'erreur est signalée en
 * console et la section concernée n'est pas initialisée, plutôt que d'échouer
 * plus loin sur une propriété de `null` (règle 15).
 */

/**
 * @param {string} sectionName Nom de la section, utilisé dans le message d'erreur.
 * @param {Record<string, string>} idsByRole Identifiants à résoudre, par rôle.
 * @returns {Record<string, HTMLElement> | null} les éléments, ou `null` si l'un
 *   d'eux est introuvable.
 */
export function findElements(sectionName, idsByRole) {
  const elements = {};
  const missingIds = [];

  for (const [role, id] of Object.entries(idsByRole)) {
    const element = document.getElementById(id);
    if (element === null) {
      missingIds.push(id);
    }
    elements[role] = element;
  }

  if (missingIds.length > 0) {
    console.error(`Bref : section « ${sectionName} » incomplète, éléments introuvables : ${missingIds.join(", ")}.`);
    return null;
  }

  return elements;
}
