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
  - extension **activée** : les actions sur les notes sont accessibles (création, et modification / suppression de chaque note) ;
  - extension **désactivée** : ces actions ne sont pas accessibles, les notes restent consultables et conservées ;
  - l'état courant est toujours affiché sous la case à cocher.
- L'état est mémorisé dans `chrome.storage.local` (clé `activationEnabled`) : il survit à la fermeture de la popup et du navigateur. L'extension est activée par défaut.
- **Consulter les notes** : à l'ouverture, la popup affiche les notes du site de l'onglet actif, et uniquement celles-ci (ou « Aucune note pour ce site. »). Les pages internes du navigateur (`chrome://…`), la boutique d'extensions et les pages non autorisées ne peuvent pas porter de notes : un message l'indique.
- **Créer une note** : bouton « Créer une note » (accessible seulement quand l'extension est activée) → saisir un texte libre, puis **Enregistrer** ou **Annuler**. Rien n'est créé tant que l'enregistrement n'a pas abouti : annuler, ou fermer la popup, ne laisse aucune note. La note est associée au site de l'onglet actif et apparaît aussitôt dans la liste.
- **Modifier une note** : bouton « Modifier » de la note concernée (accessible seulement quand l'extension est activée) → l'éditeur s'ouvre avec le contenu enregistré, puis **Enregistrer** ou **Annuler**. Comme pour la création, rien n'est écrit avant « Enregistrer » : annuler, ou fermer la popup, laisse la note inchangée. L'identifiant de la note et sa date de création sont conservés, seule la date de modification est mise à jour.
- **Supprimer une note** : bouton « Supprimer » de la note concernée (accessible seulement quand l'extension est activée) → une boîte de confirmation rappelle le contenu de la note ; **Supprimer** dans la boîte confirme, **Annuler** (ou Échap) la conserve. La note disparaît aussitôt de la liste (« Note supprimée. ») ; quand c'était la dernière note du site, le site n'est plus stocké du tout. Rien n'est écrit avant la confirmation, et un échec laisse la boîte ouverte avec un message clair.

## Structure

- `manifest.json` — Manifest V3 (service worker en module, déclaré aussi en `background.scripts` pour Firefox)
- `popup/` — interface de la popup (`popup.html`, `popup.css`, `popup.js` et les modules : `activation-section.js`, `notes-section.js`, `notes-view.js`, `note-item.js`, `note-editor.js`, `notes-list.js`, `delete-confirm.js`, `notes-client.js`, `note-texts.js`, `find-elements.js`)
- `service-worker/` — contexte d'arrière-plan, seul lecteur et écrivain des notes stockées : `service-worker.js` (vérification de l'expéditeur et routage des messages), `note-requests.js` (traitement des demandes de consultation et des écritures : création, modification, suppression) et `note-write-pipeline.js` (chemin d'écriture commun : URL normalisée, activation revérifiée, traduction des échecs)
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
- Création : l'identifiant (`crypto.randomUUID()`) et les dates sont produits par le contexte d'arrière-plan ; le texte est enregistré sans ses espaces de bord, dans la limite de 5000 caractères (`MAX_NOTE_LENGTH`).
- Modification : seul le contenu de la note visée est réécrit (l'identifiant, l'URL et la date de création sont conservés) ; la date de modification (`updatedAt`) est mise à jour par le contexte d'arrière-plan. Les autres notes du site, y compris celles dont la forme est invalide, restent intactes.
- Suppression : seule la note visée est retirée ; quand c'était la dernière note du site, la clé `notes:<URL>` est supprimée (le site n'est plus stocké).
- Normalisation d'URL : seules les pages `http`/`https` portent des notes, le fragment (`#…`) est ignoré, la requête (`?…`) est conservée (voir `shared/url.js`).
- Rien n'est envoyé sur le réseau : les notes restent sur l'appareil.

