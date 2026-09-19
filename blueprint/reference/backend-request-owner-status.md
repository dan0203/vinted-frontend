# Demande backend : param `status` sur `GET /offers`

Demande du frontend (`vinted-frontend`), 2026-09-19. Elle fait suite à l'ajout du
filtre `?owner=` et à la remarque « les offres `sold` du vendeur restent
invisibles dans ce listing ». Réponse : oui, il faut lever ça, et voici sous
quelle forme.

Features concernées côté front : **23** (édition, suppression et changement de
statut de ses propres offres), **26** et **27** (« Mes offres » et les actions
propriétaire dans cette page).

## Le problème

`GET /offers` applique toujours `status: { $ne: 'sold' }`, filtre owner compris.
Un vendeur ne peut donc pas voir ses propres ventes. Deux conséquences
concrètes :

- « Mes offres » ne peut pas afficher l'historique des ventes, alors que c'est
  l'inventaire du vendeur, pas un catalogue public.
- La feature 23 devient incohérente : on peut passer une offre en `sold` puis la
  perdre de vue définitivement, sans pouvoir la rouvrir ni constater la vente.
  Seule l'URL directe `GET /offers/:id` y donne encore accès, ce qui suppose
  d'avoir gardé l'identifiant.

## Ce qu'on demande

Un param `status` **explicite** sur `GET /offers`, **accepté uniquement quand
`owner` vaut l'utilisateur authentifié**, refusé sinon.

| Aspect | Contrat demandé |
|---|---|
| Nom | `status` |
| Valeurs | `available`, `reserved`, `sold` |
| Forme | **liste séparée par des virgules**, ex. `status=available,sold` |
| Défaut | **inchangé** : sans le param, `sold` reste exclu |
| Autorisation | accepté seulement si `owner` est présent **et** égal à l'id de l'utilisateur authentifié |
| Sans token valide | 401, comme les autres routes authentifiées |
| Token valide mais `owner` absent ou différent de soi | 403 |
| Valeur inconnue (`status=foo`) | 400, comme les autres params |
| Composabilité | avec `title`, `priceMin`, `priceMax`, `sort`, `page`, sans restriction |
| Forme de réponse | inchangée : `{ count, page, totalPages, offers }` |

Cas limites à fixer explicitement, au choix du backend mais à documenter :
valeur vide (`status=`), doublons (`status=sold,sold`), et liste contenant les
trois valeurs (doit équivaloir à « tout », y compris `sold`).

## Pourquoi cette option plutôt que lever l'exclusion implicitement

L'autre piste évoquée était de lever l'exclusion dès que `owner` vaut
l'utilisateur authentifié, sans nouveau param. Trois raisons de ne pas le faire :

1. **La même URL deviendrait ambiguë.** `?owner=X` ne renverrait pas le même
   corps selon le porteur du token. C'est pénible à mettre en cache, à tester, et
   à diagnostiquer quand deux utilisateurs comparent ce qu'ils voient.
2. **Le front perdrait un cas d'usage.** Avec un param explicite, il peut aussi
   demander l'inverse, « seulement mes offres encore en vente ». Le comportement
   implicite impose toujours la vue élargie.
3. **Le contrat public reste intact.** Le défaut ne bouge pas, donc « `sold`
   exclu de `GET /offers` » continue de valoir pour tout lecteur non
   propriétaire. C'est indispensable à la feature 25 (profil vendeur public), qui
   ne doit surtout pas exposer l'historique de ventes d'un tiers.

## Pourquoi une liste et pas une valeur unique

`status=sold` seul obligerait « Mes offres » à faire deux appels pour son cas
nominal, afficher tout l'inventaire, puis à fusionner et re-trier côté client
deux réponses paginées indépendamment, ce qui casse la pagination. La liste rend
le cas nominal faisable en une requête : `?owner=<moi>&status=available,reserved,sold`.
Le coût côté backend est un `$in` au lieu d'un `$ne`.

## Critères d'acceptation suggérés

- `?owner=<moi>&status=sold` authentifié comme `<moi>` : renvoie mes offres
  vendues, exclues du même appel sans le param.
- `?owner=<moi>&status=available,sold` : renvoie les deux, pagination cohérente
  avec `count`.
- `?owner=<autre>&status=sold` authentifié : 403.
- `?status=sold` sans `owner` : 403.
- `?owner=<moi>&status=sold` sans token : 401.
- `?owner=<moi>&status=foo` : 400.
- `?owner=<moi>` sans `status` : comportement actuel, `sold` exclu.
- `?owner=<moi>&status=available&priceMin=10&sort=price-desc&page=2` : filtres
  combinés, réponse toujours `{ count, page, totalPages, offers }`.

## Conséquences côté front

`project-overview.md` verrouille « les offres `sold` sont exclues de
`GET /offers` ». Dès que ce param existe, le front passera par `/overview` pour y
consigner la nuance, sinon la prochaine feature repartira de l'ancienne règle.

Rien d'autre n'est demandé dans ce lot. En particulier `POST /payment`
(feature 6) reste hors sujet ici.
