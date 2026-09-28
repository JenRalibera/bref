/*
 * note-item.js — rendu d'une note dans la liste de la popup.
 *
 * Le contenu est inséré via `textContent` : il n'est jamais interprété comme du
 * HTML (règle 07). Les retours à la ligne sont conservés par `white-space:
 * pre-wrap` (voir `popup.css`).
 */

/**
 * @param {object} note Note déjà validée (voir `shared/note.js`).
 * @returns {HTMLLIElement} l'élément de liste correspondant à la note.
 */
export function createNoteItem(note) {
  const item = document.createElement("li");
  item.className = "note";

  const content = document.createElement("p");
  content.className = "note-content";
  content.textContent = note.content;
  item.append(content);

  const meta = document.createElement("p");
  meta.className = "note-meta";
  const time = document.createElement("time");
  time.dateTime = note.createdAt;
  time.textContent = formatDate(note.createdAt);
  meta.append("Créée le ", time);
  item.append(meta);

  return item;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}
