/*
 * note-item.js — rendu d'une note dans la liste de la popup.
 *
 * Le contenu est inséré via `textContent` : il n'est jamais interprété comme du
 * HTML (règle 07). Les retours à la ligne sont conservés par `white-space:
 * pre-wrap` (voir `popup.css`).
 *
 * Chaque note porte son propre bouton « Modifier » (AC1) : la note à modifier
 * est désignée explicitement. Le bouton est créé désactivé et n'est ouvert
 * qu'après lecture d'un état d'activation vrai (AC5, voir `notes-view.js`).
 */

/** Sélecteur des boutons d'action d'une note, pour les activer d'un bloc. */
export const NOTE_ACTION_SELECTOR = "[data-note-action]";

const NOTE_ACTION_EDIT = "edit";
const NOTE_EDIT_TEXT = "Modifier";
const NOTE_EDIT_LABEL_PREFIX = "Modifier la note ";
const NOTE_EDIT_LABEL_MAX_EXCERPT = 40;

/**
 * @param {object} note Note déjà validée (voir `shared/note.js`).
 * @param {{ canEdit?: boolean, onEdit?: ((note: object, trigger: HTMLButtonElement) => void) | null }} options
 *   `onEdit` reçoit la note et le bouton qui l'a déclenché (ce bouton retrouve
 *   le focus à la fermeture de l'éditeur) ; sans `onEdit`, aucun bouton n'est
 *   ajouté.
 * @returns {HTMLLIElement} l'élément de liste correspondant à la note.
 */
export function createNoteItem(note, { canEdit = false, onEdit = null } = {}) {
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

  if (onEdit !== null) {
    item.append(createEditAction(note, canEdit, onEdit));
  }

  return item;
}

/**
 * Crée la zone d'actions d'une note, avec son bouton « Modifier ».
 *
 * Avec plusieurs notes, le libellé visible « Modifier » ne suffit pas à
 * distinguer les boutons pour un lecteur d'écran : le nom accessible précise la
 * note visée (règle 10).
 *
 * @param {object} note
 * @param {boolean} canEdit
 * @param {(note: object, trigger: HTMLButtonElement) => void} onEdit
 * @returns {HTMLDivElement}
 */
function createEditAction(note, canEdit, onEdit) {
  const actions = document.createElement("div");
  actions.className = "note-actions";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "notes-action notes-action--secondary";
  button.dataset.noteAction = NOTE_ACTION_EDIT;
  button.dataset.noteId = note.id;
  button.disabled = !canEdit;
  button.textContent = NOTE_EDIT_TEXT;
  button.setAttribute("aria-label", `${NOTE_EDIT_LABEL_PREFIX}« ${buildExcerpt(note.content)} »`);
  button.addEventListener("click", () => {
    onEdit(note, button);
  });

  actions.append(button);

  return actions;
}

/**
 * Replace le focus sur le bouton « Modifier » d'une note affichée.
 *
 * Après un enregistrement, la liste est re-rendue : le bouton qui a ouvert
 * l'éditeur n'existe plus, le focus est donc rendu au bouton équivalent de la
 * note modifiée (règle 10). La comparaison porte sur la valeur de l'attribut et
 * non sur un sélecteur : l'identifiant d'une note vient du stockage et n'est pas
 * fiable (règle 07).
 *
 * @param {HTMLElement} list Liste des notes affichées.
 * @param {string} noteId
 */
export function focusNoteEditAction(list, noteId) {
  for (const action of list.querySelectorAll(NOTE_ACTION_SELECTOR)) {
    if (action.dataset.noteId === noteId) {
      action.focus();
      return;
    }
  }
}

function buildExcerpt(content) {
  const collapsed = content.replace(/\s+/g, " ").trim();

  return collapsed.length > NOTE_EDIT_LABEL_MAX_EXCERPT
    ? `${collapsed.slice(0, NOTE_EDIT_LABEL_MAX_EXCERPT)}…`
    : collapsed;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}
