/*
 * activation-state.js — état d'activation de l'extension (activée/désactivée).
 *
 * Source de vérité : `chrome.storage.local`, clé `activationEnabled`.
 * Persister dans le stockage (et non en mémoire) est indispensable : la popup est
 * détruite à sa fermeture et aucun contexte ne partage de mémoire (règle 06).
 *
 * Seule cette clé est écrite lors d'une désactivation : les notes stockées sont
 * donc conservées (AC5).
 */

export const ACTIVATION_STORAGE_KEY = "activationEnabled";

/** État appliqué tant que l'utilisateur n'a jamais activé/désactivé l'extension. */
export const DEFAULT_ACTIVATION_ENABLED = true;

/**
 * Lit l'état d'activation stocké.
 *
 * @returns {Promise<boolean>} l'état stocké, ou `DEFAULT_ACTIVATION_ENABLED` si
 *   aucun état n'a encore été enregistré.
 * @throws {Error} si la valeur stockée existe mais n'est pas un booléen
 *   (stockage altéré ou écrit par une version incompatible).
 */
export async function readActivationEnabled() {
  const stored = await chrome.storage.local.get(ACTIVATION_STORAGE_KEY);
  const storedValue = stored[ACTIVATION_STORAGE_KEY];

  if (storedValue === undefined) {
    return DEFAULT_ACTIVATION_ENABLED;
  }

  if (typeof storedValue !== "boolean") {
    throw new Error(
      `État d'activation invalide dans chrome.storage.local : la clé "${ACTIVATION_STORAGE_KEY}" doit contenir un booléen.`
    );
  }

  return storedValue;
}

/**
 * Enregistre l'état d'activation.
 *
 * N'écrit que la clé d'activation : le reste du stockage (les notes) n'est ni
 * modifié ni supprimé.
 *
 * @param {boolean} enabled
 * @returns {Promise<void>}
 * @throws {TypeError} si `enabled` n'est pas un booléen.
 */
export async function writeActivationEnabled(enabled) {
  if (typeof enabled !== "boolean") {
    throw new TypeError("writeActivationEnabled attend un booléen.");
  }

  await chrome.storage.local.set({ [ACTIVATION_STORAGE_KEY]: enabled });
}

/**
 * Observe les changements d'état d'activation (par exemple depuis un autre
 * contexte de l'extension) pour garder l'interface synchronisée sans polling.
 *
 * @param {(enabled: boolean) => void} onChange
 * @returns {() => void} fonction de désabonnement, à appeler à la destruction
 *   du contexte appelant.
 */
export function watchActivationEnabled(onChange) {
  const listener = (changes, areaName) => {
    if (areaName !== "local" || !(ACTIVATION_STORAGE_KEY in changes)) {
      return;
    }

    const { newValue } = changes[ACTIVATION_STORAGE_KEY];
    if (typeof newValue !== "boolean") {
      console.warn(
        `Bref : changement de l'état d'activation ignoré, la clé "${ACTIVATION_STORAGE_KEY}" n'est plus un booléen.`
      );
      return;
    }

    onChange(newValue);
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
