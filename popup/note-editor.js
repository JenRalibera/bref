/*
 * note-editor.js — éditeur de note de la popup.
 *
 * Le même formulaire sert à créer une note et à modifier une note existante :
 * la création part d'un champ vide, la modification d'un contenu pré-rempli.
 * L'éditeur présente le formulaire et rend compte du résultat ; il ne connaît
 * ni le stockage ni la messagerie.
 *
 * Tant que l'enregistrement n'a pas réussi, rien n'est écrit (AC4) et le texte
 * saisi est conservé (règle 09).
 *
 * Le formulaire est placé dans le <fieldset> des actions sur les notes : quand
 * l'extension est désactivée, ses contrôles sont désactivés par le navigateur,
 * sans logique de verrouillage supplémentaire (AC5).
 */

import { MAX_NOTE_LENGTH } from "../shared/note.js";
import { findElements } from "./find-elements.js";
import { createNoteEditorImage } from "./note-editor-image.js";

/** Modes de l'éditeur : une nouvelle note, ou une note existante à modifier. */
const NOTE_EDITOR_MODE = {
  CREATE: "create",
  EDIT: "edit",
};

const NOTE_EDITOR_TEXTS = {
  [NOTE_EDITOR_MODE.CREATE]: {
    title: "Nouvelle note",
    sitePrefix: "Note pour ",
    unknownSite: "La note sera associée au site courant.",
  },
  [NOTE_EDITOR_MODE.EDIT]: {
    title: "Modifier la note",
    sitePrefix: "Modifier la note de ",
    unknownSite: "La note sera modifiée pour le site courant.",
  },
};

const ELEMENT_IDS = {
  form: "note-editor",
  title: "note-editor-title",
  site: "note-editor-site",
  input: "note-content",
  preview: "note-editor-preview",
  previewImage: "note-editor-image",
  removeImageButton: "remove-note-image",
  error: "note-editor-error",
  saveButton: "save-note",
  cancelButton: "cancel-note",
};

/**
 * Crée l'éditeur de note.
 *
 * @param {{ onSubmit: (draft: { noteId: string | null, content: string, image?: string | null }, editor: object) => Promise<void> }} options
 *   `onSubmit` reçoit le brouillon — `noteId` vaut `null` pour une création,
 *   `image` vaut l'URL de données collée, `null` sans image, ou `undefined`
 *   en modification quand l'image existante est conservée — et le
 *   contrôleur de l'éditeur (pour afficher une erreur ou le fermer).
 * @returns {{ openCreate: (options: object) => void, openEdit: (options: object) => void, close: () => void, showError: (message: string) => void } | null}
 *   `null` si la popup est incomplète.
 */
export function createNoteEditor({ onSubmit }) {
  const elements = findElements("éditeur de note", ELEMENT_IDS);
  if (elements === null) {
    return null;
  }

  elements.input.maxLength = MAX_NOTE_LENGTH;

  /** Gestionnaire de l'image du brouillon (collage, retrait, aperçu). */
  const editorImage = createNoteEditorImage({
    elements: {
      input: elements.input,
      preview: elements.preview,
      previewImage: elements.previewImage,
      removeImageButton: elements.removeImageButton,
    },
    showError,
    hideError,
  });

  const editor = { openCreate, openEdit, close, showError };

  let isSaving = false;

  /** Note en cours de modification, `null` pour une création. */
  let editedNoteId = null;

  /** Élément à refocaliser à la fermeture (règle 10). */
  let trigger = null;

  /**
   * Ouvre l'éditeur sur une nouvelle note.
   *
   * @param {{ siteHost: string | null, trigger: HTMLButtonElement }} options
   */
  function openCreate({ siteHost, trigger: createTrigger }) {
    show({ mode: NOTE_EDITOR_MODE.CREATE, siteHost, content: "", image: null, noteId: null, trigger: createTrigger });
  }

  /**
   * Ouvre l'éditeur sur une note existante.
   *
   * @param {{ note: object, siteHost: string | null, trigger: HTMLButtonElement }} options
   */
  function openEdit({ note, siteHost, trigger: editTrigger }) {
    show({
      mode: NOTE_EDITOR_MODE.EDIT,
      siteHost,
      content: note.content,
      image: note.image ?? null,
      noteId: note.id,
      trigger: editTrigger,
    });
  }

  function show({ mode, siteHost, content, image, noteId, trigger: openingTrigger }) {
    const texts = NOTE_EDITOR_TEXTS[mode];
    const isAnotherTarget = elements.form.hidden || editedNoteId !== noteId;

    editedNoteId = noteId;
    trigger = openingTrigger;
    elements.title.textContent = texts.title;
    elements.site.textContent = siteHost === null ? texts.unknownSite : `${texts.sitePrefix}${siteHost}`;
    hideError();

    // Rouvrir le même formulaire ne doit jamais effacer un texte non enregistré
    // (règle 09) ; viser une autre note affiche le contenu de celle-ci.
    if (isAnotherTarget) {
      elements.input.value = content;
      editorImage.show(image);
    }

    elements.form.hidden = false;
    elements.input.focus();
  }

  function close() {
    elements.form.hidden = true;
    elements.input.value = "";
    editorImage.show(null);
    hideError();

    editedNoteId = null;

    if (trigger !== null) {
      trigger.focus();
      trigger = null;
    }
  }

  function showError(message) {
    elements.error.textContent = message;
    elements.error.hidden = false;
  }

  function hideError() {
    elements.error.textContent = "";
    elements.error.hidden = true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    hideError();
    isSaving = true;
    elements.saveButton.disabled = true;

    const draft = {
      noteId: editedNoteId,
      content: elements.input.value,
      image: editorImage.draftImage(editedNoteId === null),
    };

    try {
      await onSubmit(draft, editor);
    } finally {
      isSaving = false;
      elements.saveButton.disabled = false;
    }
  }

  elements.form.addEventListener("submit", (event) => {
    void handleSubmit(event);
  });
  elements.cancelButton.addEventListener("click", () => {
    close();
  });

  return editor;
}
