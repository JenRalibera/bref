/*
 * note-item.js — rendu d'une note dans la liste de la popup.
 *
 * Le contenu est inséré via `textContent` : il n'est jamais interprété comme du
 * HTML (règle 07). Les retours à la ligne sont conservés par `white-space:
 * pre-wrap` (voir `popup.css`).
 *
 * Chaque note porte ses propres boutons « Modifier » et « Supprimer » (AC1 de
 * la modification, AC1 de la suppression) : la note visée est désignée
 * explicitement. Les boutons sont créés désactivés et n'ouvrent qu'après
 * lecture d'un état d'activation vrai (AC5, voir `notes-list.js`).
 */

import { formatNoteExcerpt } from "./note-texts.js";

/** Sélecteur des boutons d'action d'une note, pour les activer d'un bloc. */
export const NOTE_ACTION_SELECTOR = "[data-note-action]";

const NOTE_ACTION_EDIT = "edit";
const NOTE_ACTION_DELETE = "delete";
const NOTE_EDIT_TEXT = "Modifier";
const NOTE_DELETE_TEXT = "Supprimer";

/**
 * @param {object} note Note déjà validée (voir `shared/note.js`).
 * @param {{ canEdit?: boolean, onEdit?: ((note: object, trigger: HTMLButtonElement) => void) | null, onDelete?: ((note: object, trigger: HTMLButtonElement) => void) | null }} options
 *   `onEdit` / `onDelete` reçoivent la note et le bouton qui l'a déclenché ;
 *   sans callback correspondant, aucun bouton n'est ajouté.
 * @returns {HTMLLIElement} l'élément de liste correspondant à la note.
 */
export function createNoteItem(note, { canEdit = false, onEdit = null, onDelete = null } = {}) {
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

  if (onEdit !== null || onDelete !== null) {
    item.append(createActions(note, { canEdit, onEdit, onDelete }));
  }

  return item;
}

/**
 * Crée la zone d'actions d'une note.
 *
 * Avec plusieurs notes, les libellés visibles « Modifier » et « Supprimer » ne
 * suffisent pas à distinguer les boutons pour un lecteur d'écran : chaque nom
 * accessible précise la note visée par un résumé de son contenu (règle 10).
 *
 * @param {object} note
 * @param {{ canEdit: boolean, onEdit: ((note: object, trigger: HTMLButtonElement) => void) | null, onDelete: ((note: object, trigger: HTMLButtonElement) => void) | null }} options
 * @returns {HTMLDivElement}
 */
function createActions(note, { canEdit, onEdit, onDelete }) {
  const actions = document.createElement("div");
  actions.className = "note-actions";
  const excerpt = formatNoteExcerpt(note.content);

  if (onEdit !== null) {
    actions.append(
      createActionButton({
        note,
        canEdit,
        action: NOTE_ACTION_EDIT,
        text: NOTE_EDIT_TEXT,
        label: `Modifier la note « ${excerpt} »`,
        onClick: onEdit,
      })
    );
  }

  if (onDelete !== null) {
    actions.append(
      createActionButton({
        note,
        canEdit,
        action: NOTE_ACTION_DELETE,
        text: NOTE_DELETE_TEXT,
        label: `Supprimer la note « ${excerpt} »`,
        onClick: onDelete,
      })
    );
  }

  return actions;
}

/**
 * @param {{ note: object, canEdit: boolean, action: string, text: string, label: string, onClick: (note: object, trigger: HTMLButtonElement) => void }} options
 * @returns {HTMLButtonElement} bouton portant la note visée (`data-note-id`),
 *   désactivé tant que l'extension est désactivée (AC5).
 */
function createActionButton({ note, canEdit, action, text, label, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "notes-action notes-action--secondary";
  button.dataset.noteAction = action;
  button.dataset.noteId = note.id;
  button.disabled = !canEdit;
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", () => {
    onClick(note, button);
  });

  return button;
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
    if (action.dataset.noteId === noteId && action.dataset.noteAction === NOTE_ACTION_EDIT) {
      action.focus();
      return;
    }
  }
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}
