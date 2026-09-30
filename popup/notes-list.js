/*
 * notes-list.js — cycle de vie des actions sur la liste des notes de la popup.
 *
 * Ce module orchestre les opérations sur les notes du site courant : lecture,
 * création, modification et suppression. Après toute écriture réussie, la
 * liste est relue depuis le stockage : l'affichage correspond donc toujours au
 * contenu réellement enregistré (règle 09).
 *
 * Il délègue l'accès au stockage à `notes-client.js` (règle 06), le rendu à
 * `notes-view.js` et les messages d'échec à `note-texts.js`. En cas d'échec,
 * rien n'est écrit et le texte saisi reste affiché (AC4).
 */

import { isValidNote } from "../shared/note.js";
import {
  createNoteForActiveTab,
  deleteNoteForActiveTab,
  requestNotesForActiveTab,
  updateNoteForActiveTab,
} from "./notes-client.js";
import { focusNoteEditAction } from "./note-item.js";
import { getNoteDeleteFailureText, getNoteSaveFailureText } from "./note-texts.js";
import {
  renderLoading,
  renderNotes,
  renderViewFailure,
  setNoteActionsEnabled,
} from "./notes-view.js";

const NOTE_CREATED_MESSAGE = { text: "Note enregistrée.", state: "saved" };
const NOTE_UPDATED_MESSAGE = { text: "Note modifiée.", state: "saved" };
const NOTE_DELETED_MESSAGE = { text: "Note supprimée.", state: "saved" };

/**
 * Crée le gestionnaire de la liste des notes.
 *
 * @param {{ elements: { site: HTMLElement, message: HTMLElement, list: HTMLElement, createButton: HTMLButtonElement }, noteEditor: object | null, deleteConfirmation: object | null }} options
 *   `noteEditor` et `deleteConfirmation` peuvent être `null` (popup incomplète)
 *   : les actions correspondantes ne sont alors pas proposées.
 * @returns {{ load: () => Promise<void>, setEnabled: (isEnabled: boolean) => void, openCreate: () => void, saveNote: (editor: object, draft: { noteId: string | null, content: string, image?: string | null }) => Promise<void>, removeNote: (note: object, dialog: object) => Promise<void> }}
 */
export function createNotesList({ elements, noteEditor, deleteConfirmation }) {
  /** Hôte du site affiché, utilisé pour situer la note en cours d'édition. */
  let displayedSiteHost = null;

  /** Actions sur les notes ouvertes : vrai après lecture d'un état d'activation vrai. */
  let isEnabled = false;

  /**
   * Relit les notes du site courant et les affiche.
   *
   * @param {{ text: string, state: string } | null} message remplace le
   *   décompte des notes en cas de succès.
   */
  async function refresh(message = null) {
    const result = await requestNotesForActiveTab();

    if (!result.ok) {
      displayedSiteHost = renderViewFailure(elements, result.reason);
      return;
    }

    displayedSiteHost = renderNotes(elements, result.siteUrl, result.notes.filter(isValidNote), {
      message,
      canEdit: isEnabled,
      onEdit: noteEditor === null ? null : openEdit,
      onDelete: deleteConfirmation === null ? null : askDelete,
    });
  }

  /** Charge les notes du site courant en annonçant le chargement. */
  async function load() {
    displayedSiteHost = renderLoading(elements);
    await refresh();
  }

  /** Ouvre l'éditeur sur la note choisie (AC1 de la modification). */
  function openEdit(note, trigger) {
    noteEditor.openEdit({ note, siteHost: displayedSiteHost, trigger });
  }

  /** Ouvre la confirmation sur la note choisie (AC1 de la suppression). */
  function askDelete(note) {
    deleteConfirmation.confirm(note);
  }

  /** Ouvre l'éditeur sur une nouvelle note (crée le déclencheur si besoin). */
  function openCreate() {
    if (noteEditor === null) {
      return;
    }

    noteEditor.openCreate({ siteHost: displayedSiteHost, trigger: elements.createButton });
  }

  /**
   * Ouvre ou ferme l'accès aux actions sur les notes (AC5).
   *
   * @param {boolean} value
   */
  function setEnabled(value) {
    isEnabled = value;
    setNoteActionsEnabled(elements, value);
  }

  /**
   * Enregistre le brouillon de l'éditeur : création, ou modification de la note
   * visée. En cas d'échec, l'éditeur reste ouvert avec le texte saisi et
   * l'image collée (AC4).
   *
   * @param {{ showError: (message: string) => void, close: () => void }} editor
   * @param {{ noteId: string | null, content: string, image?: string | null }} draft
   */
  async function saveNote(editor, draft) {
    const isCreation = draft.noteId === null;
    const result = isCreation
      ? await createNoteForActiveTab(draft.content, draft.image ?? null)
      : await updateNoteForActiveTab(draft.noteId, draft.content, draft.image);

    if (!result.ok) {
      editor.showError(getNoteSaveFailureText(result.reason));
      return;
    }

    editor.close();
    await refresh(isCreation ? NOTE_CREATED_MESSAGE : NOTE_UPDATED_MESSAGE);

    // La liste vient d'être re-rendue : le bouton qui avait ouvert l'éditeur
    // n'existe plus, le focus est donc placé sur le nouveau bouton de la note
    // modifiée (règle 10). Une création laisse le focus sur « Créer une note ».
    if (!isCreation) {
      focusNoteEditAction(elements.list, draft.noteId);
    }
  }

  /**
   * Supprime la note confirmée. La boîte reste ouverte en cas d'échec, avec un
   * message actionnable (règle 15).
   *
   * @param {object} note Note visée, déjà validée.
   * @param {{ showError: (message: string) => void, close: () => void }} dialog
   */
  async function removeNote(note, dialog) {
    const result = await deleteNoteForActiveTab(note.id);

    if (!result.ok) {
      dialog.showError(getNoteDeleteFailureText(result.reason));
      return;
    }

    dialog.close();
    await refresh(NOTE_DELETED_MESSAGE);

    // Le bouton « Supprimer » a disparu avec la note : le focus est replacé sur
    // un contrôle toujours présent (règle 10).
    elements.createButton.focus();
  }

  return { load, setEnabled, openCreate, saveNote, removeNote };
}
