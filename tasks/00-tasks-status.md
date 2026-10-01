# Suivi des tâches

État des features du dépôt `bref`.

## Récapitulatif

| Feature | Fichier | Statut |
|---|---|---|
| 01 — View extension | `tasks/01-feature-01-view-extension.md` | ✅ Terminé et validé dans Chrome et Firefox |
| 02 — Activate extension | `tasks/02-feature-01-activate-extension.md` | ✅ Terminé et validé dans Chrome |
| 03 — View note | `tasks/03-feature-02-view-note.md` | ✅ Terminé et validé dans Chrome et Firefox |
| 04 — Create note | `tasks/04-feature-02-create-note.md` | ✅ Terminé et validé dans Chrome et Firefox |
| 05 — Edit note | `tasks/05-feature-02-edit-note.md` | ✅ Terminé et validé dans Chrome et Firefox |
| 06 — Remove note | `tasks/06-feature-02-remove-note.md` | ✅ Terminé et validé dans Chrome et Firefox |
| 07 — Add picture to note | `tasks/07-feature-02-add-picture.md` | ✅ Terminé et validé dans Chrome et Firefox |

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
- [x] Validation manuelle dans Chrome et Firefox
  - [x] AC1 : extension activée → « Créer une note » ouvre l'éditeur et place le focus dans le champ
  - [x] AC2 : saisir un texte avec accents, caractères spéciaux, emoji et retours à la ligne → le texte est conservé tel quel, retours à la ligne compris
  - [x] AC3 : « Enregistrer » → « Note enregistrée. » s'affiche et la note apparaît dans la liste ; rouvrir la popup → la note est toujours là
  - [x] AC4 : « Annuler » puis vérifier dans la console de la popup (`chrome.storage.local.get(null)`) qu'aucune note n'a été écrite ; laisser un texte sans enregistrer et fermer la popup → aucune note créée
  - [x] Champ vide : « Enregistrer » ne crée rien (validation native du navigateur)
  - [x] AC5 : désactiver l'extension → boutons et éditeur inaccessibles ; la création est refusée côté arrière-plan (`DISABLED`)
  - [x] Console du service worker / de la page d'événements : aucune erreur

## Feature 05 — Edit note

### Critères d'acceptation

- [x] AC1 — Accéder à l'édition : chaque note affichée porte son bouton « Modifier » ; celui-ci ouvre l'éditeur sur **cette** note (titre « Modifier la note », contenu pré-rempli, focus dans le champ, focus rendu au bouton à la fermeture)
- [x] AC2 — Modification : le contenu est modifiable dans le `<textarea>` (texte libre : accents, caractères spéciaux, emojis, retours à la ligne), dans la limite de `MAX_NOTE_LENGTH` (5000 caractères)
- [x] AC3 — Enregistrement : « Enregistrer » envoie `UPDATE_NOTE_REQUEST` ; le contexte d'arrière-plan remplace le seul contenu de la note visée (identifiant, URL et `createdAt` conservés, `updatedAt` mis à jour), la liste est relue depuis le stockage et « Note modifiée. » est annoncé
- [x] AC4 — Pas d'enregistrement automatique : aucune écriture avant la validation du formulaire ; « Annuler » et la fermeture de la popup ne modifient rien, et un échec conserve le texte saisi
- [x] AC5 — Extension désactivée : les boutons « Modifier » sont créés désactivés et ne sont ouverts qu'après lecture d'un état d'activation vrai ; l'éditeur est dans le `<fieldset disabled>` et la modification est refusée côté arrière-plan (`DISABLED`) même si l'interface est contournée

### Livré

- `manifest.json` — version `0.5.0` (aucune permission supplémentaire : `storage` et `activeTab` suffisent)
- `shared/notes-messages.js` — `UPDATE_NOTE_REQUEST` / `UPDATE_NOTE_RESULT` et `NOTES_EDIT_FAILURE` (dont `NOTE_NOT_FOUND`) ; les raisons d'échec partagent leurs valeurs d'une opération à l'autre
- `shared/note.js` — `updateNoteContent()` : conserve `id`, `url` et `createdAt`, met à jour `updatedAt`
- `shared/notes-store.js` — `updateNoteForUrl()` (ne réécrit que la note visée, à sa position, préserve les autres entrées y compris invalides) et `NotesStoreNoteNotFoundError`
- `service-worker/note-requests.js` (nouveau) — traitement des demandes extrait de `service-worker.js` pour rester sous 200 lignes (règle 04) : `handleViewNotesRequest()`, `handleCreateNoteRequest()`, `handleUpdateNoteRequest()` (verrou d'activation et validation côté arrière-plan)
- `service-worker/service-worker.js` — réduit à la vérification de l'expéditeur et au routage des messages connus (route `UPDATE_NOTE_REQUEST` ajoutée)
- `popup/note-item.js` — bouton « Modifier » par note, désactivé par défaut, nom accessible précisant la note (règle 10)
- `popup/note-editor.js` — un seul formulaire pour créer et modifier (`openCreate` / `openEdit`), contenu pré-rempli, focus rendu au bouton déclencheur ; rien n'est écrit avant la soumission
- `popup/notes-view.js` — rendu des actions d'une note, ouverture/fermeture de ces actions selon l'état d'activation (`setNoteActionsEnabled`), messages d'échec d'enregistrement (`NOTE_NOT_FOUND`)
- `popup/notes-client.js` — `updateNoteForActiveTab()` et mutualisation de la résolution de l'onglet actif et de la validation des réponses
- `popup/notes-section.js` — suivi de l'état d'activation, enregistrement d'une création ou d'une modification, rechargement de la liste depuis le stockage, nettoyage des écouteurs
- `popup/popup.html`, `popup/popup.css` — titre de l'éditeur identifié, bouton global « Modifier une note » remplacé par les boutons de note, styles de la zone d'actions d'une note
- `popup/popup.js` — nettoyage des écouteurs de la section « Notes du site »
- `README.md` — utilisation (modifier une note), structure, données
- ADR-006 — action par note, protocole de modification, réutilisation de l'éditeur

### Limites connues (à traiter dans une prochaine feature)

- « Supprimer une note » reste un bouton inactif (interface seule) ; un texte d'aide le signale.
- La modification lit puis réécrit le tableau du site : deux popups enregistrant au même instant pourraient perdre une note (usage local mono-utilisateur).
- Si la note a été supprimée entre son affichage et l'enregistrement, la modification est refusée (`NOTE_NOT_FOUND`) et la liste n'est pas rafraîchie sous l'éditeur : rouvrir la popup.
- Aucun garde-fou avant de changer de cible dans l'éditeur : viser une autre note remplace le brouillon en cours (rien n'est jamais enregistré sans « Enregistrer »).

### Validation

- [x] `manifest.json` : JSON valide, version `0.5.0`, permissions inchangées (`storage`, `activeTab`), ressources référencées présentes
- [x] Syntaxe JavaScript vérifiée (`node --check` en mode module) sur `shared/*.js`, `popup/*.js` et `service-worker/*.js`
- [x] Cohérence des identifiants HTML ↔ `getElementById` (`note-editor-title` ajouté ; `create-note`, `note-editor`, `note-editor-site`, `note-content`, `note-editor-error`, `save-note`, `cancel-note`, `notes-site`, `notes-message`, `notes-list`)
- [x] Taille des fichiers : chaque module reste sous 200 lignes (maximum : `notes-view.js`, 187 lignes)
- [x] Logique vérifiée hors navigateur (harnais Node avec `chrome.storage.local` simulé, 27 assertions) : `updateNoteContent` conserve l'identité de la note et ne la mute pas ; `updateNoteForUrl` ne réécrit que la note visée et préserve l'ordre et les autres entrées ; refus `INVALID_REQUEST` / `UNSUPPORTED_PAGE` / `INVALID_CONTENT` / `DISABLED` / `NOTE_NOT_FOUND` / `STORE_CONFLICT` ; création non régressée
- [x] Éditeur vérifié hors navigateur (mini-stub DOM, 22 assertions) : mode création / modification, titre et site annoncés, contenu pré-rempli, brouillon transmis **uniquement** à la soumission, brouillon conservé à la réouverture du même formulaire, focus rendu au bouton déclencheur
- [x] Boutons de note vérifiés hors navigateur (mini-stub DOM, 15 assertions) : « Modifier » créé désactivé par défaut et selon l'état d'activation, nom accessible précisant la note (contenu tronqué), clic transmettant la note et son bouton, focus rendu au bouton de la note modifiée après re-rendu (aucun focus si la note a disparu)
- [x] Aucune régression sur les features 01 à 04 : lecture, création, gating d'activation et messages d'échec inchangés (vérifiés par le harnais et par relecture du diff)
- [x] Validation manuelle dans Chrome et Firefox
  - [x] AC1 : extension activée → « Modifier » sur une note ouvre l'éditeur pré-rempli avec le contenu de cette note et place le focus dans le champ
  - [x] AC2 : modifier le texte (accents, caractères spéciaux, emoji, retours à la ligne) → le texte est conservé tel quel
  - [x] AC3 : « Enregistrer » → « Note modifiée. » s'affiche et la liste montre le nouveau contenu ; rouvrir la popup → la modification est toujours là ; dans la console de la popup, `chrome.storage.local.get(null)` → même `id`, même `createdAt`, `updatedAt` à jour
  - [x] AC4 : modifier puis « Annuler », puis vérifier dans la console de la popup qu'aucune écriture n'a eu lieu ; laisser une modification non enregistrée et fermer la popup → la note reste inchangée
  - [x] Champ vide : « Enregistrer » ne vide pas la note (validation native du navigateur)
  - [x] AC5 : désactiver l'extension → les boutons « Modifier » sont grisés et non focusables, l'éditeur est inaccessible ; la modification est refusée côté arrière-plan (`DISABLED`)
  - [x] Note supprimée du stockage avant l'enregistrement → « Cette note n'existe plus… » s'affiche et le texte saisi est conservé
  - [x] Console du service worker / de la page d'événements : aucune erreur

## Feature 06 — Remove note

### Critères d'acceptation

- [x] AC1 — Demande de suppression : le bouton « Supprimer » d'une note ouvre une boîte de confirmation qui rappelle le contenu de la note concernée
- [x] AC2 — Annulation : « Annuler » (ou Échap) ferme la boîte sans rien écrire ; la note est conservée
- [x] AC3 — Confirmation : « Supprimer » dans la boîte → `DELETE_NOTE_REQUEST` → la note est retirée du stockage, la liste est relue et « Note supprimée. » s'affiche
- [x] AC4 — Dernière note du site : la clé `notes:<URL>` est supprimée de `chrome.storage.local` (pas de vue globale à ce jour : l'état vide « Aucune note pour ce site. » reste affichable)
- [x] AC5 — Extension désactivée : les boutons « Supprimer » sont désactivés (état d'activation lu à l'ouverture de la popup et suivi du changement) **et** l'écriture est refusée par l'arrière-plan (`DISABLED`)

### Livré

- `popup/delete-confirm.js` — boîte de confirmation `<dialog>` native (résumé du contenu, messages d'échec, Échap bloqué pendant l'envoi, focus géré par l'élément natif)
- `popup/note-item.js` — bouton « Supprimer » par note, nom accessible précisant la note (résumé via `formatNoteExcerpt`), callback `onDelete`
- `popup/note-texts.js` — textes d'échec (enregistrement + suppression) et résumé de note partagés par la vue et le client
- `popup/notes-list.js` — cycle lecture/écriture de la liste (charger, enregistrer, supprimer, restauration du focus)
- `popup/notes-section.js` — réduit au câblage (éditeur, boîte de confirmation, suivi de l'activation)
- `popup/notes-client.js` — `deleteNoteForActiveTab` + table unique `REQUEST_FAILURES` indexée par type de message
- `popup/notes-view.js` — rendu avec `onDelete` et message explicite sur un site devenu vide
- `popup/popup.html` — `<dialog id="delete-confirm">` hors du `<fieldset disabled>`, bouton global « Supprimer une note » retiré, texte d'aide mis à jour
- `popup/popup.css` — variante `--danger`, styles `.delete-confirm*`, jeton `--color-danger-strong`
- `shared/notes-messages.js` — `DELETE_NOTE_REQUEST` / `DELETE_NOTE_RESULT`, `NOTES_DELETE_FAILURE`
- `shared/notes-store.js` — `removeNoteForUrl` (retrait ciblé, clé retirée à la dernière note, erreurs `NotesStoreConflictError` / `NotesStoreNoteNotFoundError`)
- `service-worker/note-write-pipeline.js` — chemin d'écriture commun (URL normalisée → activation revérifiée → écriture → traduction des échecs)
- `service-worker/note-requests.js` — `handleDeleteNoteRequest` + table `WRITE_OPERATIONS` (création, modification, suppression)
- `service-worker/service-worker.js` — routage de `DELETE_NOTE_REQUEST`
- `manifest.json` — version `0.6.0`, permissions inchangées
- ADR-007 — suppression de note (boîte de confirmation, chemin d'écriture partagé) dans `.clinerules/21-architecture-decision-records.md`
- `README.md` — utilisation, structure et section Données mises à jour

### Limites connues

- La lecture-modification-écriture du tableau du site n'est pas atomique (limite identique aux features 04/05) : deux confirmations simultanées pourraient perdre une note (usage local mono-utilisateur).
- Si la note a été supprimée entre son affichage et la confirmation, la boîte affiche « Cette note n'existe plus… » ; la liste n'est pas rechargée sous la boîte ouverte : fermer et rouvrir la popup.
- La liste n'est pas observée en direct (`chrome.storage.onChanged` n'est branché que sur l'état d'activation) : une modification faite par une autre popup pendant que la popup reste ouverte n'apparaîtra qu'au prochain cycle d'écriture ou à la réouverture.
- `toSpliced` nécessite Chrome ≥ 110 / Firefox ≥ 116 : compatible avec les minimums ADR-004 (121), mais à revoir si un minimum plus ancien est visé un jour.

### Validation

- [x] `manifest.json` : JSON valide, version `0.6.0`, permissions inchangées (`storage`, `activeTab`), ressources référencées présentes
- [x] Syntaxe JavaScript vérifiée (`node --check` en mode module) sur `shared/*.js`, `popup/*.js` et `service-worker/*.js`
- [x] Cohérence des identifiants HTML ↔ `getElementById` (nouveaux : `delete-confirm`, `delete-confirm-form`, `delete-confirm-message`, `delete-confirm-error`, `delete-confirm-accept`, `delete-confirm-cancel`)
- [x] Taille des fichiers : chaque module reste ≤ 200 lignes (maximum : `popup/notes-client.js`, 194 lignes)
- [x] Harnais Node (27 vérifications, `chrome.*` et DOM simulés, vrais modules du dépôt) :
  - `removeNoteForUrl` : retrait ciblé, préservation des autres entrées (invalides comprises), clé retirée à la dernière note, refus `STORE_CONFLICT` / `NOTE_NOT_FOUND`
  - arrière-plan : refus `INVALID_REQUEST` / `UNSUPPORTED_PAGE` / `DISABLED` (sans écriture), succès sans toucher aux autres notes
  - textes : résumé de note (espaces réduits, troncature), messages de suppression et d'enregistrement inchangés
  - `deleteNoteForActiveTab` : succès, `DISABLED`, onglet sans URL (refus locale, sans envoi), URL interne refusée par l'arrière-plan
  - boutons de note : « Supprimer » créé désactivé puis activé selon l'état d'activation, nom accessible précisant la note, clic transmettant la note et son bouton
  - boîte de confirmation : ouverture avec le contenu (AC1), confirmation déléguée une seule fois, échec affiché avec réactivation du bouton, annulation sans écriture (AC2)
  - `notesList.removeNote` : fermeture + stockage vidé + message + focus « Créer une note » après la dernière note (AC3/AC4) ; erreur affichée dans la boîte ouverte et stockage inchangé en cas d'échec
- [x] Relecture du diff : aucune modification hors périmètre (éditeur, activation et consultation inchangés)
- [x] Validation manuelle dans Chrome et Firefox (règle 06) :
  - [x] AC1 : « Supprimer » ouvre la boîte rappelant le contenu de la note, le focus entre dans la boîte
  - [x] AC2 : « Annuler » puis « Échap » → la note est toujours là (console de la popup : `chrome.storage.local.get(null)`)
  - [x] AC3 : « Supprimer » dans la boîte → « Note supprimée. », note absente de la liste et du stockage ; rouvrir la popup → toujours absente
  - [x] AC4 : supprimer la dernière note du site → la clé `notes:<URL>` a disparu ; l'état vide s'affiche
  - [x] AC5 : extension désactivée → boutons « Supprimer » grisés et non focusables ; depuis la console du service worker, envoyer un `DELETE_NOTE_REQUEST` → refus `DISABLED`, stockage inchangé
  - [x] Échec affiché : retirer la note (via la console) pendant que la boîte est ouverte, puis confirmer → boîte ouverte avec message, bouton réutilisable, aucune écriture
  - [x] Focus : après confirmation, le focus retombe sur « Créer une note » ; Échap pendant l'envoi n'interrompt pas la suppression
  - [x] Console du service worker / de la page d'événements : aucune erreur



## Feature 07 — Ajouter une image à une note

### Critères d'acceptation

- [x] AC1 — Coller une image : coller une image dans le champ de texte de l'éditeur la place dans le brouillon (aperçu affiché) ; coller du texte seul continue de fonctionner normalement
- [x] AC2 — Image facultative : une note peut être enregistrée sans image (`image: null`), y compris les notes créées avant cette version (clé `image` absente)
- [x] AC3 — Une note avec image : la note porte son texte **et** une image (une seule par note : un second collage remplace la précédente, « Retirer l'image » l'enlève du brouillon)
- [x] AC4 — Enregistrement : l'image du brouillon n'est écrite qu'à « Enregistrer » (création comme modification) ; elle est conservée avec la note et affichée avec elle dans la liste

### Livré

- `shared/note-image.js` (nouveau) — `NOTE_IMAGE_MIME_TYPES` (PNG, JPEG, GIF, WebP), `MAX_NOTE_IMAGE_BYTES` (1 Mo), `normalizeNoteImage()` / `isValidNoteImage()` (URL de données `data:image/…;base64,…` uniquement, `null`/`undefined` acceptés, poids décodé estimé, SVG refusé), `estimateDecodedBytes()`
- `shared/note.js` — `image` documentée dans la forme d'une note ; `isValidNote()` accepte `null` et l'absence de clé ; `createNote(siteUrl, content, image = null)` ; `updateNoteContent(note, content, image = undefined)` (`undefined` conserve, `null` retire)
- `shared/notes-messages.js` — `image` documentée dans `CREATE_NOTE_REQUEST` et `UPDATE_NOTE_REQUEST` ; raison d'échec `INVALID_IMAGE` ajoutée à `NOTES_CREATE_FAILURE` et `NOTES_EDIT_FAILURE` (les valeurs restent partagées entre opérations)
- `shared/notes-store.js` — `updateNoteForUrl(url, id, content, image = undefined)` : l'image existante est conservée par défaut
- `service-worker/note-requests.js` — image revalidée et normalisée en création comme en modification (règle 07) ; image absente = conservée, `null` = retirée, URL de données = remplacée
- `popup/note-editor-image.js` (nouveau) — état d'image du brouillon : collage (`paste`, premier fichier **accepté** du presse-papiers), aperçu, « Retirer l'image », `draftImage(isCreation)` ; lecture en URL de données par `FileReader`, erreurs annoncées via `role="alert"`
- `popup/note-editor.js` — délègue l'image à `note-editor-image.js` (fichier maintenu sous 200 lignes, règle 04) et joint `image` au brouillon soumis
- `popup/notes-client.js` — `createNoteForActiveTab(content, image = null)` / `updateNoteForActiveTab(noteId, content, image = undefined)` : la demande ne porte `image` que lorsqu'elle est définie (`undefined` = conserver)
- `popup/notes-list.js` — transmet l'image du brouillon à l'enregistrement
- `popup/note-item.js` — affiche l'image de la note (`<img>` dont la source est l'URL de données stockée, `alt` reprenant le résumé du contenu, règle 10)
- `popup/note-texts.js` — `NOTES_INVALID_IMAGE_TEXT` (types et limite affichables) et correspondance de `INVALID_IMAGE`
- `popup/popup.html`, `popup/popup.css` — indication de collage, aperçu avec bouton « Retirer l'image », styles `.note-image`, `.note-editor-hint`, `.note-editor-preview`, `.note-editor-image`
- `manifest.json` — version `0.7.0`, permissions inchangées (`storage`, `activeTab`)
- ADR-008 — image d'une note (stockage en URL de données dans la note, types et limite, protocole) dans `.clinerules/21-architecture-decision-records.md`
- `README.md` — utilisation, structure et section Données

### Limites connues

- L'image est stockée dans la note, en URL de données : une image de 1 Mo occupe ~1,4 Mo du quota de `chrome.storage.local` (~5 Mo partagés par toutes les notes). Un dépassement est signalé (`WRITE_FAILED`) sans perte du texte saisi, mais aucune purge ni compression automatique n'existe.
- Une seule image par note : un second collage remplace la première, sans confirmation (le remplacement reste visible dans l'aperçu avant l'enregistrement).
- Le collage est le seul mode d'ajout (pas de sélecteur de fichier ni de glisser-déposer), et seuls les types acceptés sont retenus côté éditeur comme côté arrière-plan : un SVG collé est ignoré (sans message, puisqu'il n'est pas retenu comme image).
- Selon le système et l'application source, le presse-papiers peut ne pas exposer le fichier image : le collage ne produit alors aucun effet.
- Si la lecture de l'image échoue (`FileReader`), l'échec est annoncé dans l'éditeur et l'image précédente du brouillon est conservée.
- La lecture-modification-écriture du tableau du site n'est pas atomique (limite identique aux features 04 à 06).


### Validation

- [x] `manifest.json` : JSON valide, version `0.7.0`, permissions inchangées (`storage`, `activeTab`), ressources référencées présentes
- [x] Syntaxe JavaScript vérifiée (`node --check` en mode module) sur `shared/*.js`, `popup/*.js` et `service-worker/*.js`
- [x] Cohérence des identifiants HTML ↔ `getElementById` (nouveaux : `note-editor-preview`, `note-editor-image`, `remove-note-image`)
- [x] Taille des fichiers : chaque module reste ≤ 200 lignes (maximum : `popup/note-editor.js` et `popup/notes-client.js`, 196 lignes ; `popup/note-editor.js` ramené de 289 à 196 par extraction de `popup/note-editor-image.js`, 147 lignes)
- [x] Harnais Node sur les vrais modules (28 vérifications, `chrome.storage.local` simulé) :
  - `isValidNoteImage` / `normalizeNoteImage` : `null` et `undefined` acceptés (AC2), PNG et JPEG acceptés ; SVG, type non image, URL distante, chaîne vide, objet et image au-delà de la limite refusés ; une image à la limite reste acceptée
  - `createNote` : image `null` par défaut, image conservée quand elle est fournie ; une note dont l'image est invalide est rejetée ; une note sans clé `image` reste valide
  - `updateNoteContent` : conserve (`undefined`), retire (`null`), remplace (URL de données), sans muter la note d'origine
  - `addNoteForUrl` / `updateNoteForUrl` / `readNotesForUrl` : image relue depuis le stockage, conservée par défaut, retirée avec `null`, remplacée par une URL de données, autres notes du site préservées
- [x] Harnais Node sur le flux complet (20 vérifications, modules d'arrière-plan et module d'image de l'éditeur réels) :
  - arrière-plan : création et modification avec image acceptées et stockées (AC3/AC4) ; `INVALID_IMAGE` (SVG) et `INVALID_REQUEST` (image non textuelle) refusés **sans écriture** ; `DISABLED` sans écriture ; modification sans image = image conservée, avec `null` = retirée, avec URL de données = remplacée
  - éditeur (`note-editor-image.js`) : collage d'une image PNG (aperçu affiché, brouillon porteur de l'image), collages SVG et non-image ignorés, collage par `items`, échec de lecture annoncé, retrait de l'image (aperçu masqué, focus rendu au champ), brouillon `undefined` en modification quand l'image est conservée et `null` quand elle est retirée
- [x] Harnais Node d'intégration de l'éditeur (10 vérifications, `document` simulé, vrai module `popup/note-editor.js`) : identifiants HTML résolus, création et modification ouvertes avec le bon état d'aperçu, brouillon de création porteur de l'image collée, image existante non renvoyée en modification, retrait transmis (`null`), annulation sans soumission et focus rendu au déclencheur
- [x] Relecture du diff : aucune modification hors périmètre (activation, consultation et suppression inchangées)
- [x] Validation manuelle dans Chrome et Firefox (règle 06) :
  - [x] AC1 : coller une capture d'écran dans le champ de texte → l'aperçu s'affiche ; coller du texte seul → le texte est saisi normalement
  - [x] AC2 : enregistrer une note sans image → la note apparaît sans image
  - [x] AC3 : enregistrer une note texte + image → la note affiche le texte **et** l'image ; rouvrir en modification → l'aperçu est là ; « Retirer l'image » puis « Enregistrer » → l'image a disparu
  - [x] AC4 : coller une image puis « Annuler » (ou fermer la popup) → aucune note ni image écrites (console de la popup : `chrome.storage.local.get(null)`)
  - [x] Refus : coller un SVG (ou une image de plus de 1 Mo) → message d'erreur à l'enregistrement, texte conservé dans l'éditeur
  - [x] Extension désactivée : éditeur inaccessible ; depuis la console du service worker, envoyer un `CREATE_NOTE_REQUEST` avec une image → refus `DISABLED`, stockage inchangé
  - [x] Console du service worker / de la page d'événements : aucune erreur

