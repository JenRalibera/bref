/*
 * activation-section.js — section « Activation » de la popup.
 *
 * L'état d'activation est lu et écrit via `shared/activation-state.js` :
 *   - case à cocher = contrôle d'activation (AC1, AC2) ;
 *   - message de statut = état visible et annoncé (AC7) ;
 *   - <fieldset> désactivé = actions sur les notes inaccessibles (AC3, AC4).
 *
 * Cette section ne connaît pas les notes : elle ne fait qu'ouvrir ou fermer
 * l'accès au <fieldset> des actions. Le câblage des boutons d'action et la
 * consultation des notes appartiennent à la section « Notes du site ».
 */

import {
  readActivationEnabled,
  watchActivationEnabled,
  writeActivationEnabled,
} from "../shared/activation-state.js";
import { findElements } from "./find-elements.js";

const ELEMENT_IDS = {
  toggle: "activation-toggle",
  status: "activation-status",
  notesActions: "notes-actions",
};

const ACTIVATION_STATUS_TEXT = {
  enabled: "Activée : les actions sur les notes sont accessibles.",
  disabled: "Désactivée : les actions sur les notes ne sont pas accessibles, vos notes sont conservées.",
};

const ACTIVATION_READ_ERROR_TEXT =
  "L'état d'activation n'a pas pu être lu : l'extension est traitée comme désactivée.";

const ACTIVATION_SAVE_ERROR_TEXT =
  "L'état d'activation n'a pas pu être enregistré. Merci de réessayer.";

/**
 * Affiche l'état d'activation : contrôle, accès aux actions et message visible.
 *
 * @param {{ toggle: HTMLInputElement, status: HTMLElement, notesActions: HTMLFieldSetElement }} elements
 * @param {boolean} isEnabled
 */
function renderActivationState(elements, isEnabled) {
  const state = isEnabled ? "enabled" : "disabled";

  elements.toggle.checked = isEnabled;
  elements.notesActions.disabled = !isEnabled;
  setStatusText(elements.status, ACTIVATION_STATUS_TEXT[state], state);
}

/**
 * @param {HTMLElement} statusElement
 * @param {string} text
 * @param {"enabled" | "disabled" | "error"} state
 */
function setStatusText(statusElement, text, state) {
  statusElement.textContent = text;
  statusElement.dataset.state = state;
}

/**
 * Relit l'état stocké et l'affiche. En cas d'échec, l'extension est traitée
 * comme désactivée (état le moins permissif) et l'erreur est signalée.
 *
 * @param {{ toggle: HTMLInputElement, status: HTMLElement, notesActions: HTMLFieldSetElement }} elements
 */
async function refreshActivationState(elements) {
  try {
    renderActivationState(elements, await readActivationEnabled());
  } catch (error) {
    console.error("Bref : lecture de l'état d'activation impossible.", error);
    renderActivationState(elements, false);
    setStatusText(elements.status, ACTIVATION_READ_ERROR_TEXT, "error");
  }
}

/**
 * Applique le choix de l'utilisateur. En cas d'échec d'écriture, l'interface
 * revient à l'état réellement stocké et l'erreur est signalée.
 *
 * @param {{ toggle: HTMLInputElement, status: HTMLElement, notesActions: HTMLFieldSetElement }} elements
 * @param {Event} event
 */
async function handleToggleChange(elements, event) {
  const requestedState = event.target.checked;

  try {
    await writeActivationEnabled(requestedState);
    renderActivationState(elements, requestedState);
  } catch (error) {
    console.error("Bref : enregistrement de l'état d'activation impossible.", error);
    await refreshActivationState(elements);
    setStatusText(elements.status, ACTIVATION_SAVE_ERROR_TEXT, "error");
  }
}

/**
 * Initialise la section d'activation.
 *
 * @returns {() => void} nettoyage des écouteurs, à appeler à la fermeture de
 *   la popup.
 */
export function initActivationSection() {
  const elements = findElements("activation", ELEMENT_IDS);
  if (elements === null) {
    return () => {};
  }

  const onToggleChange = (event) => {
    void handleToggleChange(elements, event);
  };

  const unwatchActivation = watchActivationEnabled((isEnabled) => {
    renderActivationState(elements, isEnabled);
  });

  elements.toggle.addEventListener("change", onToggleChange);

  void refreshActivationState(elements);

  return () => {
    elements.toggle.removeEventListener("change", onToggleChange);
    unwatchActivation();
  };
}
