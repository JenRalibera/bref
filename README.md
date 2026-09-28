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
- **Consulter les notes** : à l'ouverture, la popup affiche les notes du site de l'onglet actif, et uniquement celles-ci (ou « Aucune note pour ce site. »). Les pages internes du navigateur (`chrome://…`), la boutique d'extensions et les pages non autorisées ne peuvent pas porter de notes : un message l'indique.

## Structure

- `manifest.json` — Manifest V3 (service worker en module)
- `popup/` — interface de la popup (`popup.html`, `popup.css`, `popup.js`, `activation-section.js`, `notes-section.js`, `note-item.js`)
- `service-worker/` — service worker, seul lecteur des notes stockées (`service-worker.js`)
- `shared/` — code partagé entre les contextes (`activation-state.js`, `url.js`, `note.js`, `notes-store.js`, `notes-messages.js`)
- `assets/icons/` — icônes de l'extension

## Permissions

| Permission | Raison |
|---|---|
| `storage` | Persister l'état d'activation de l'extension et les notes dans `chrome.storage.local`. |
| `activeTab` | Lire l'URL de l'onglet actif **au moment où l'utilisateur ouvre la popup**, afin d'afficher les notes de ce site. Aucune permission d'hôte permanente n'est demandée. |

## Navigateurs

- **Chrome / Chromium ≥ 121** : le contexte d'arrière-plan est un *service worker* (`background.service_worker`).
- **Firefox ≥ 121** : Firefox n'implémente pas les service workers d'arrière-plan en MV3 ; le même fichier est déclaré en `background.scripts` et démarre une *page d'événements*. Chrome 121+ ignore simplement `background.scripts` (ADR-004).
- Le code d'arrière-plan est identique pour les deux navigateurs (un seul fichier).
- Installation dans Firefox (développement) : `about:debugging#/runtime/this-firefox` → **Charger un module temporaire** → sélectionner `manifest.json`.

## Données

- Les notes sont conservées dans `chrome.storage.local`, une clé par site : `notes:<URL normalisée>` → tableau de notes.
- Forme d'une note : `{ id, url, content, createdAt, updatedAt }`.
- Normalisation d'URL : seules les pages `http`/`https` portent des notes, le fragment (`#…`) est ignoré, la requête (`?…`) est conservée (voir `shared/url.js`).
- Rien n'est envoyé sur le réseau : les notes restent sur l'appareil.

