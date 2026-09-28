# Suivi des tâches

État des features du dépôt `bref`.

## Récapitulatif

| Feature | Fichier | Statut |
|---|---|---|
| 01 — View extension | `tasks/01-feature-01-view-extension.md` | ✅ Terminé et validé dans Chrome et Firefox |
| 02 — Activate extension | `tasks/02-feature-01-activate-extension.md` | ✅ Terminé et validé dans Chrome |
| 03 — View note | `tasks/03-feature-02-view-note.md` | ✅ Terminé et validé dans Chrome et Firefox |
| 04 — Create note | `tasks/04-feature-02-create-note.md` | 🟡 Implémenté — validation manuelle dans Chrome et Firefox à faire |

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

## Feature 03 — View note

### Critères d'acceptation

- [x] AC1 — Notes du site : la popup résout l'onglet actif, le service worker lit la seule clé `notes:<URL normalisée>` de ce site
- [x] AC2 — Plusieurs notes : toutes les notes valides du site sont affichées, triées de la plus ancienne à la plus récente
- [x] AC3 — Aucune note : aucune note n'est affichée, le message « Aucune note pour ce site. » s'affiche
- [x] AC4 — Navigation : l'URL de l'onglet est résolue à chaque ouverture de la popup, donc les notes affichées suivent le site actif
- [x] AC5 — Extension désactivée : la section des notes est hors du `<fieldset disabled>` et le service worker n'applique pas l'état d'activation à la consultation

### Livré

- `manifest.json` — permission `activeTab`, contexte d'arrière-plan déclaré à la fois pour Chrome (`service_worker`) et Firefox (`scripts`), version `0.3.0`
- `shared/url.js` — normalisation d'URL (clé d'identité d'un site)
- `shared/note.js` — forme d'une note et validation
- `shared/notes-store.js` — lecture des notes d'un site (`notes:<URL normalisée>`)
- `shared/notes-messages.js` — types de messages et raisons d'échec
- `service-worker/service-worker.js` — service worker : validation de l'expéditeur et du message, lecture, réponse
- `popup/notes-section.js` — onglet actif, demande au service worker, affichage (chargement, vide, page non supportée, erreur, liste)
- `popup/note-item.js` — rendu d'une note (contenu + date de création)
- `popup/activation-section.js` — logique d'activation extraite de `popup.js`
- `popup/popup.js` — point d'entrée : initialise les deux sections
- `popup/popup.html`, `popup/popup.css` — section « Notes du site » (remplace l'état vide statique de la feature 01)
- `README.md` — permissions (`storage`, `activeTab`), structure, modèle de données
- ADR-003 — modèle de stockage, normalisation d'URL, protocole popup ⇄ service worker (`.clinerules/21-architecture-decision-records.md`)

### Limites connues (à traiter dans une prochaine feature)

- Aucune interface de création / modification / suppression à ce stade : les notes ont été semées dans `chrome.storage.local` pour cette validation (la création arrive avec la feature 04).
- La popup ne se rafraîchit pas si l'URL change alors qu'elle reste ouverte (navigation SPA) : le site est résolu à l'ouverture.
- L'état d'activation n'est pas vérifié pour la consultation (c'est voulu) ; il l'est désormais pour les opérations d'écriture (feature 04, ADR-005).
- Une note dont la forme est invalide est ignorée à l'affichage (avec un avertissement en console) ; elle reste dans le stockage.
- Navigateurs : Chrome ≥ 121 et Firefox ≥ 121 (ADR-004). Firefox ne gérant pas les service workers d'arrière-plan en MV3, le même fichier d'arrière-plan est déclaré en `background.scripts` et démarre une page d'événements ; Chrome ignore `background.scripts`.

### Validation

- [x] `manifest.json` : JSON valide, permissions `storage` + `activeTab`, contexte d'arrière-plan déclaré pour Chrome (`service_worker`) et Firefox (`scripts`), ressources référencées présentes
- [x] Syntaxe JavaScript vérifiée (`node --check` en mode module) sur `shared/*.js`, `popup/*.js` et `service-worker/service-worker.js`
- [x] Cohérence des identifiants HTML ↔ `getElementById` (`notes-site`, `notes-message`, `notes-list`)
- [x] Validation manuelle dans Chrome (`chrome://extensions` → recharger l'extension : le service worker est nouveau)
  - [x] Ouvrir la popup sur un site sans note → « Aucune note pour ce site. »
  - [x] AC1/AC2 : semer deux notes dans la console de la popup, puis ouvrir la popup sur `https://example.com`

    ```js
    await chrome.storage.local.set({
      "notes:https://example.com/": [
        {
          id: "1",
          url: "https://example.com/",
          content: "Première note",
          createdAt: "2026-09-28T10:00:00.000Z",
          updatedAt: "2026-09-28T10:00:00.000Z"
        },
        {
          id: "2",
          url: "https://example.com/",
          content: "Deuxième note\nsur deux lignes",
          createdAt: "2026-09-28T11:00:00.000Z",
          updatedAt: "2026-09-28T11:00:00.000Z"
        }
      ]
    });
    ```

    Attendu : « Notes de example.com », « 2 notes pour ce site. », les deux notes dans l'ordre chronologique.
  - [x] AC1 : sur un autre site, aucune note de `example.com` ne s'affiche
  - [x] AC4 : naviguer vers un autre site puis rouvrir la popup → les notes correspondent au nouveau site
  - [x] AC5 : désactiver l'extension → les notes restent affichées
  - [x] Page interne (par exemple `chrome://extensions`) → « Cette page ne peut pas porter de notes… »
  - [x] Console du service worker (`chrome://extensions` → « service worker ») : aucune erreur
- [x] Validation manuelle dans Firefox (`about:debugging#/runtime/this-firefox` → **Charger un module temporaire** → `manifest.json`)
  - [x] Le module se charge sans l'erreur `background.service_worker is currently disabled`
  - [x] La popup s'ouvre et affiche les notes du site courant (même comportement que dans Chrome)
  - [x] Console de la page d'événements (`about:debugging` → **Inspecter**) : aucune erreur

## Feature 04 — Create note

### Critères d'acceptation

- [x] AC1 — Accéder à la création : le bouton « Créer une note » ouvre l'éditeur d'une nouvelle note (formulaire « Nouvelle note », focus placé dans le champ)
- [x] AC2 — Texte libre : `<textarea>` sans contrainte de format (accents, caractères spéciaux, emojis, retours à la ligne conservés), limité à `MAX_NOTE_LENGTH` (5000 caractères)
- [x] AC3 — Enregistrement : « Enregistrer » envoie `CREATE_NOTE_REQUEST` ; le contexte d'arrière-plan crée la note pour l'URL normalisée du site courant, la liste est rechargée depuis le stockage et « Note enregistrée. » est annoncé
- [x] AC4 — Annulation implicite : aucune écriture avant la validation du formulaire ; « Annuler » et la fermeture de la popup ne créent rien, et un échec conserve le texte saisi
- [x] AC5 — Extension désactivée : le bouton et l'éditeur sont dans le `<fieldset disabled>`, et le contexte d'arrière-plan refuse la création (`DISABLED`) même si l'interface est contournée

### Livré

- `manifest.json` — version `0.4.0` (aucune permission supplémentaire : `storage` et `activeTab` suffisent)
- `shared/note.js` — `MAX_NOTE_LENGTH`, `normalizeNoteContent()` (texte libre, espaces de bord nettoyés), `createNote()` (identifiant `crypto.randomUUID()`, dates ISO)
- `shared/notes-store.js` — `addNoteForUrl()` (ajout sans réécrire les entrées invalides déjà stockées) et `NotesStoreConflictError`
- `shared/notes-messages.js` — `CREATE_NOTE_REQUEST` / `CREATE_NOTE_RESULT` et raisons d'échec de création
- `service-worker/service-worker.js` — routage des demandes connues et `handleCreateNoteRequest()` (validation, état d'activation, création)
- `popup/note-editor.js` — formulaire d'édition (ouverture / fermeture, focus, erreurs, protection contre le double envoi)
- `popup/notes-client.js` — résolution de l'onglet actif, envoi des messages et validation des réponses (consultation et création)
- `popup/notes-section.js` — orchestration : câblage du bouton « Créer une note », enregistrement puis rechargement de la liste depuis le stockage
- `popup/notes-view.js` — rendu de la section notes (chargement, vide, liste, échec de consultation) et messages d'échec de création
- `popup/find-elements.js` — résolution partagée des éléments DOM de la popup (utilisée aussi par `activation-section.js`)
- `popup/popup.html`, `popup/popup.css` — éditeur de note (libellé, `<textarea required>`, erreur `role="alert"` associée par `aria-describedby`, bouton secondaire)
- `README.md` — utilisation (création), structure, données
- ADR-005 — protocole de création, verrou d'activation côté arrière-plan, règles de contenu

### Limites connues (à traiter dans une prochaine feature)

- « Modifier une note » et « Supprimer une note » restent des boutons inactifs (interface seule) ; un texte d'aide le signale.
- L'ajout lit puis réécrit le tableau du site : deux popups enregistrant au même instant pourraient perdre une note (usage local mono-utilisateur).
- Pas de brouillon : fermer la popup pendant la rédaction perd le texte non enregistré (rien n'est créé, conformément à AC4).

### Validation

- [x] `manifest.json` : JSON valide, version `0.4.0`, permissions inchangées (`storage`, `activeTab`)
- [x] Syntaxe JavaScript vérifiée (`node --check` en mode module) sur `shared/*.js`, `popup/*.js` et `service-worker/service-worker.js`
- [x] Cohérence des identifiants HTML ↔ `getElementById` (`create-note`, `note-editor`, `note-editor-site`, `note-content`, `note-editor-error`, `save-note`, `cancel-note`)
- [x] Taille des fichiers : chaque module reste sous 200 lignes (règle 04)
- [ ] Validation manuelle dans Chrome et Firefox
  - [ ] AC1 : extension activée → « Créer une note » ouvre l'éditeur et place le focus dans le champ
  - [ ] AC2 : saisir un texte avec accents, caractères spéciaux, emoji et retours à la ligne → le texte est conservé tel quel, retours à la ligne compris
  - [ ] AC3 : « Enregistrer » → « Note enregistrée. » s'affiche et la note apparaît dans la liste ; rouvrir la popup → la note est toujours là
  - [ ] AC4 : « Annuler » puis vérifier dans la console de la popup (`chrome.storage.local.get(null)`) qu'aucune note n'a été écrite ; laisser un texte sans enregistrer et fermer la popup → aucune note créée
  - [ ] Champ vide : « Enregistrer » ne crée rien (validation native du navigateur)
  - [ ] AC5 : désactiver l'extension → boutons et éditeur inaccessibles ; la création est refusée côté arrière-plan (`DISABLED`)
  - [ ] Console du service worker / de la page d'événements : aucune erreur
