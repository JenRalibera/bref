# Bref

Extension pour notes.

# Hello, everyone !

J'essaie de créer des extensions pour navigateur aléatoiremet, du coup, si tu veux ajouter quelque chose, n'hésite pas à me laisser un petit message ! :)

## Installation (développement)

1. Ouvrir `chrome://extensions`
2. Activer le **Mode développeur**
3. **Charger l'extension non empaquetée** → sélectionner la racine de ce dépôt
4. Cliquer sur l'icône **Bref** dans la barre d'outils pour ouvrir la popup

## Utilisation

- **Activer / désactiver l'extension** : dans la popup, cocher ou décocher « Activer l'extension ».
  - extension **activée** : les boutons **Créer / Modifier / Supprimer une note** sont accessibles ;
  - extension **désactivée** : ces boutons ne sont pas accessibles, les notes restent consultables et conservées ;
  - l'état courant est toujours affiché sous la case à cocher.
- L'état est mémorisé dans `chrome.storage.local` (clé `activationEnabled`) : il survit à la fermeture de la popup et du navigateur. L'extension est activée par défaut.

## Structure

- `manifest.json` — Manifest V3
- `popup/` — interface de la popup (`popup.html`, `popup.css`, `popup.js`)
- `shared/` — code partagé entre les contextes de l'extension (`activation-state.js`)
- `assets/icons/` — icônes de l'extension

## Permissions

| Permission | Raison |
|---|---|
| `storage` | Persister l'état d'activation de l'extension, et à terme les notes, dans `chrome.storage.local`. |

