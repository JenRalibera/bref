/*
 * popup.js — point d'entrée de la popup.
 *
 * La popup est composée de deux sections indépendantes, chacune responsable de
 * son interface et de ses écouteurs :
 *   - « Activation » (`activation-section.js`) ;
 *   - « Notes du site » (`notes-section.js`).
 *
 * Ce module se contente de les initialiser puis de libérer les écouteurs de la
 * section d'activation à la fermeture de la popup (règle 11).
 */

import { initActivationSection } from "./activation-section.js";
import { initNotesSection } from "./notes-section.js";

const cleanupActivationSection = initActivationSection();

initNotesSection();

window.addEventListener("pagehide", () => {
  cleanupActivationSection();
});

