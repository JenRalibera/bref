# Suivi des tâches

État des features du dépôt `bref`.

## Récapitulatif

| Feature | Fichier | Statut |
|---|---|---|
| 01 — View extension | `tasks/01-feature-01-view-extension.md` | ✅ Terminé et validé dans Chrome et Firefox |

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
