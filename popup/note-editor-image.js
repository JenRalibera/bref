/*
 * note-editor-image.js — image facultative du brouillon de l'éditeur.
 *
 * Une note porte au plus une image (AC3) : coller une image remplace la
 * précédente, « Retirer l'image » la retire du brouillon. Le collage n'écrit
 * rien : l'image n'est conservée qu'à l'enregistrement (AC4). Seuls les types
 * conservables en note sont retenus (voir `shared/note-image.js`) : un SVG,
 * qui peut embarquer du script, n'est jamais accepté (règle 07).
 */

import { NOTE_IMAGE_MIME_TYPES } from "../shared/note-image.js";

/** Texte annoncé quand une image collée ne peut pas être lue. */
export const NOTE_IMAGE_PASTE_ERROR_TEXT =
  "L'image collée n'a pas pu être lue. Réessayez avec une autre image.";

/**
 * Crée le gestionnaire d'image du brouillon de l'éditeur.
 *
 * @param {{ elements: { input: HTMLTextAreaElement, preview: HTMLElement, previewImage: HTMLImageElement, removeImageButton: HTMLButtonElement }, showError: (message: string) => void, hideError: () => void }} options
 * @returns {{ show: (image: string | null) => void, draftImage: (isCreation: boolean) => string | null | undefined }}
 *   `show` affiche l'image d'ouverture ; `draftImage` vaut l'image du brouillon
 *   (`undefined` en modification quand l'image existante est conservée).
 */
export function createNoteEditorImage({ elements, showError, hideError }) {
  /**
   * Image du brouillon : URL de données collée, ou `null` sans image (AC2).
   * `imageUnchanged` distingue « image existante conservée » (à ne pas
   * renvoyer) de « image retirée » (`null` à renvoyer).
   */
  let image = null;
  let imageUnchanged = true;

  elements.input.addEventListener("paste", handlePaste);
  elements.removeImageButton.addEventListener("click", handleRemoveImage);

  return { show, draftImage };

  /**
   * Affiche l'image d'ouverture, ou masque l'aperçu sans image.
   *
   * @param {string | null} value
   */
  function show(value) {
    image = value;
    imageUnchanged = true;

    if (value === null) {
      elements.previewImage.removeAttribute("src");
      elements.preview.hidden = true;
      return;
    }

    elements.previewImage.src = value;
    elements.preview.hidden = false;
  }

  /**
   * @param {boolean} isCreation
   * @returns {string | null | undefined} image du brouillon : en modification,
   *   une image existante non touchée n'est pas renvoyée (le contexte
   *   d'arrière-plan la conserve).
   */
  function draftImage(isCreation) {
    return isCreation || !imageUnchanged ? image : undefined;
  }

  /**
   * Remplace l'image du brouillon par l'image collée (AC1).
   *
   * Seule la première image acceptée du presse-papiers est retenue (une note
   * porte au plus une image) ; le collage n'écrit rien : l'image n'est
   * conservée qu'à l'enregistrement (AC4).
   *
   * @param {ClipboardEvent} event
   */
  function handlePaste(event) {
    const pastedImage = findPastedImage(event.clipboardData);
    if (pastedImage === null) {
      return;
    }

    event.preventDefault();
    hideError();

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        showError(NOTE_IMAGE_PASTE_ERROR_TEXT);
        return;
      }

      image = reader.result;
      imageUnchanged = false;
      elements.previewImage.src = reader.result;
      elements.preview.hidden = false;
    };
    reader.onerror = () => {
      showError(NOTE_IMAGE_PASTE_ERROR_TEXT);
    };
    reader.readAsDataURL(pastedImage);
  }

  /**
   * @param {DataTransfer | null | undefined} clipboardData
   * @returns {File | null} la première image acceptée du presse-papiers, ou `null`.
   */
  function findPastedImage(clipboardData) {
    if (clipboardData === null || clipboardData === undefined) {
      return null;
    }

    for (const file of clipboardData.files ?? []) {
      if (isAcceptedNoteImage(file.type)) {
        return file;
      }
    }

    for (const item of clipboardData.items ?? []) {
      if (isAcceptedNoteImage(item.type)) {
        const file = typeof item.getAsFile === "function" ? item.getAsFile() : null;
        if (file !== null && isAcceptedNoteImage(file.type)) {
          return file;
        }
      }
    }

    return null;
  }

  /**
   * @param {unknown} mimeType
   * @returns {boolean} `true` si le type est une image conservable en note.
   */
  function isAcceptedNoteImage(mimeType) {
    return typeof mimeType === "string" && NOTE_IMAGE_MIME_TYPES.includes(mimeType);
  }

  function handleRemoveImage() {
    image = null;
    imageUnchanged = false;
    elements.previewImage.removeAttribute("src");
    elements.preview.hidden = true;
    hideError();
    elements.input.focus();
  }
}
