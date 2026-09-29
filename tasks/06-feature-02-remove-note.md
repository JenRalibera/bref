## User Story

En tant qu'utilisateur,
je veux supprimer une note,
afin de retirer une information dont je n'ai plus besoin.

## Critères d'acceptation

AC1 — Demande de suppression

Quand l'utilisateur choisit Supprimer,
alors une demande de confirmation est affichée.

AC2 — Annulation

Quand l'utilisateur annule la confirmation,
alors la note est conservée.

AC3 — Confirmation

Quand l'utilisateur confirme la suppression,
alors la note est supprimée.

AC4 — Dernière note

Si la note supprimée était la dernière note du site,
alors le site n'est plus présent dans la vue globale.

AC5 — Extension désactivée

Si l'extension est désactivée, l'action Supprimer n'est pas accessible.

## Statut

Implémenté le 2026-09-29 ; validation détaillée dans `tasks/00-tasks-status.md` (section Feature 06).

- [x] AC1 — demande de confirmation : boîte `<dialog>` rappelant le contenu de la note
- [x] AC2 — annulation : la note est conservée, rien n'est écrit
- [x] AC3 — confirmation : la note est retirée du stockage et de la liste
- [x] AC4 — dernier site : clé `notes:<URL>` supprimée (aucune vue globale à ce jour ; l'état reste affichable dans la popup)
- [x] AC5 — extension désactivée : bouton « Supprimer » désactivé dans la popup et refus `DISABLED` côté arrière-plan