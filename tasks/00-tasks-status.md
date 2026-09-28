# Suivi des tâches

État des features du dépôt `bref`.

## Récapitulatif

| Feature | Fichier | Statut |
|---|---|---|
| 01 — View extension | `tasks/01-feature-01-view-extension.md` | ✅ Terminé et validé dans Chrome et Firefox |
| 02 — Activate extension | `tasks/02-feature-01-activate-extension.md` | ✅ Terminé et validé dans Chrome |

## Feature 01 — View extension

### Critères d'acceptation

- [x] AC1 — Extension accessible : manifest `action` + icône `assets/icons/bref.jpeg`
- [x] AC2 — Ouverture de l'extension : `default_popup` → `popup/popup.html`

### Livré

- `manifest.json` — Manifest V3, zéro permission
- `popup/popup.html` — interface de la popup (état vide « Aucune note pour ce site »)
- `popup/popup.css` — styles avec design tokens
- `assets/icons/bref.jpeg` — icône existante réutilisée
- ADR-001 — stack initiale (JS vanilla, pas de build step) dans `.clinerules/21-architecture-decision-records.md`

### Validation

- [x] `manifest.json` : JSON valide, `manifest_version: 3`, `permissions: []`
- [x] Ressources référencées présentes (`popup/popup.html`, `assets/icons/bref.jpeg`)
- [x] Validation manuelle dans Chrome : « Charger l'extension non empaquetée » → clic sur l'icône Bref → ouverture de la popup

## Feature 02 — Activate extension

### Critères d'acceptation

- [x] AC1 — Activation : cocher « Activer l'extension » écrit `activationEnabled: true` dans `chrome.storage.local`
- [x] AC2 — Désactivation : décocher la case écrit `activationEnabled: false`
- [x] AC3 — Actions lorsque l'extension est activée : le groupe `#notes-actions` n'est plus `disabled` (Créer / Modifier / Supprimer une note)
- [x] AC4 — Actions lorsque l'extension est désactivée : `<fieldset id="notes-actions" disabled>` → les trois boutons sont inaccessibles à la souris et au clavier
- [x] AC5 — Conservation des notes : seule la clé `activationEnabled` est écrite, le reste de `chrome.storage.local` n'est jamais effacé
- [x] AC6 — Consultation lorsque désactivée : la zone des notes (`.empty-state`) reste affichée, hors du groupe désactivé
- [x] AC7 — État visible : case à cocher + ligne de statut `role="status"` (« Activée : … » / « Désactivée : … »)

### Livré

- `manifest.json` — permission `storage` ajoutée (persistance de l'état d'activation), version `0.2.0`
- `shared/activation-state.js` — lecture / écriture / observation de l'état d'activation (`chrome.storage.local`, clé `activationEnabled`)
- `popup/popup.html` — case à cocher + libellé associé, statut `role="status"`, `<fieldset disabled>` regroupant les actions
- `popup/popup.js` — synchronisation de l'état, gestion d'erreurs (lecture/écriture), nettoyage des écouteurs sur `pagehide`
- `popup/popup.css` — styles des sections activation / actions + tokens (`--color-success`, `--color-danger`, `--color-primary-strong`, `--color-text-inverse`)
- `README.md` — utilisation, structure, tableau de justification de la permission `storage`
- ADR-002 — décisions d'activation (stockage, gating, absence de service worker) dans `.clinerules/21-architecture-decision-records.md` (fichier non suivi par git : `.clinerules/*` est dans `.gitignore`)

### Limites connues (à traiter dans une prochaine feature)

- Les boutons Créer / Modifier / Supprimer sont une interface seule : aucun gestionnaire de clic, aucune logique de notes.
- Aucune note ne peut encore être créée : AC5 et AC6 sont garantis par conception (aucune écriture destructive, zone de notes toujours rendue) et l'affichage des notes lorsque l'extension est désactivée a été vérifié dans Chrome, mais ils ne seront pleinement démontrables qu'avec la gestion des notes.
- Le verrouillage est purement côté interface : lorsque le service worker arrivera, il devra revérifier l'état d'activation (règle 07).

### Validation

- [x] `manifest.json` : JSON valide, `permissions: ["storage"]`, ressources référencées présentes
- [x] Syntaxe JavaScript vérifiée (`node --check` en mode module) : `shared/activation-state.js`, `popup/popup.js`
- [x] Cohérence des identifiants HTML ↔ `getElementById` (`activation-toggle`, `activation-status`, `notes-actions`)
- [x] Validation manuelle dans Chrome (`chrome://extensions` → recharger → ouvrir la popup)
- [x] L'affichage correspond à l'état stocké (case à cocher + statut)
- [x] Décocher : boutons grisés et non focusables, notes toujours affichées
- [x] Fermer puis rouvrir la popup : l'état désactivé est conservé
- [x] Recocher : les boutons redeviennent focusables
