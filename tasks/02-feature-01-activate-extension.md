## User Story

En tant qu'utilisateur,
je veux pouvoir activer ou désactiver l'extension,
afin de contrôler si les actions de gestion des notes sont accessibles.

## Critères d’acceptation

AC1 — Activation

Étant donné que l'extension est désactivée,
quand l'utilisateur l'active,
alors l'extension passe à l'état activé.

AC2 — Désactivation

Étant donné que l'extension est activée,
quand l'utilisateur la désactive,
alors l'extension passe à l'état désactivé.

AC3 — Actions lorsque l'extension est activée

Étant donné que l'extension est activée,
alors l'utilisateur peut accéder aux actions :

    Créer une note

    Modifier une note

    Supprimer une note

AC4 — Actions lorsque l'extension est désactivée

  Étant donné que l'extension est désactivée,
  alors les actions :

    Créer une note

    Modifier une note

    Supprimer une note 

  ne sont pas accessibles.

AC5 — Conservation des notes

  Étant donné que l'utilisateur possède des notes,
  quand il désactive l'extension,
  alors ses notes sont conservées.

AC6 — Consultation lorsque désactivée

  Étant donné que l'extension est désactivée et que des notes existent pour le site courant,
  alors l'utilisateur peut toujours consulter ces notes.

AC7 — État visible

  L'utilisateur peut identifier si l'extension est actuellement activée ou désactivée.