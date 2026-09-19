# Demandes backend en attente

Liste consolidée de ce qui manque côté [vinted-backend](https://github.com/dan0203/vinted-backend)
pour débloquer les features restantes du frontend. Inventaire relevé en direct
sur `http://localhost:3000` le 2026-09-19, seed de ce jour.

L'idée est de pouvoir tout traiter en un lot. Les trois demandes sont
indépendantes : aucune n'attend une autre.

## Décisions en attente

Deux choix produit bloquent la forme finale de la demande 1. Ils ne bloquent pas
le démarrage du travail backend, mais il faut les avoir tranchés avant de figer
le contrat. Note la réponse ici quand tu l'auras, c'est l'endroit où `/feature 6`
ira la chercher.

| Décision | Options | Réponse |
|---|---|---|
| Le paiement réserve-t-il l'offre ? | `reserved` puis `sold` au webhook (demande une expiration), ou `sold` direct (deux acheteurs peuvent payer la même offre). Détail en [Cycle de vie du statut](#cycle-de-vie-du-statut-de-loffre). | _à décider_ |
| Où vivent les frais de 0,40 € et 0,80 € ? | Côté backend avec un `breakdown` dans la réponse, ou laissés en dur côté frontend au risque d'afficher un total différent de ce qui est débité. Détail en [Les frais](#les-frais-à-décider). | _à décider_ |

Aucune des deux ne demande de travail frontend supplémentaire : la feature 18
gère déjà l'affichage du statut, et le `breakdown` remplacerait simplement les
constantes de `Payment.jsx`.

Une troisième décision, plus simple : la **demande 3** (changer son mot de passe
en étant connecté) est optionnelle, et je recommande de ne pas la faire.

## Ce qui existe déjà, à ne pas refaire

Vérifié route par route. Une route protégée répond 401 sans token, ce qui prouve
qu'elle existe ; 404 prouve qu'elle n'existe pas.

| Route | État | Sert à |
|---|---|---|
| `POST /users/login`, `signup`, `logout`, `refresh` | OK | features 3-4, 9-11 |
| `GET /users/:id/favorites` | OK (401 sans token) | features 21-22 |
| `POST` / `DELETE /users/:id/favorites/:offerId` | OK, idempotentes, 403 sur l'id d'autrui | feature 21 |
| `GET /users/:id` | OK, public, `{ _id, account }` | feature 25 |
| `PATCH` / `PUT` / `DELETE /users/:id` | OK (401 sans token) | feature 24 |
| `PATCH` / `PUT` / `DELETE /offers/:id` | OK (401 sans token) | feature 23 |
| `GET /offers?owner=:id` | OK, composable | features 25-27 |

Deux précisions qui évitent du travail inutile :

- **`POST /users/refresh` n'a pas besoin de renvoyer `_id`.** Le frontend lit
  l'id dans le claim `sub` du token (`src/api/client.js`, `getUserId()`). Ajouter
  `_id` à la réponse ne servirait rien et ferait diverger deux sources.
- **La future feature 28 (restaurer la session au chargement) ne demande aucun
  changement backend.** `POST /users/refresh` répond déjà `{ accessToken }` avec
  le seul cookie httpOnly, sans header `Authorization` (vérifié : cookie scopé
  `path: /users`, durée ~30 jours).

## Demande 1 : route de paiement Stripe (feature 6)

**Priorité : c'est la seule feature du plan totalement bloquée.** Rien n'existe :
`POST /payment`, `POST /payments`, `POST /offers/:id/pay` et `POST /stripe/webhook`
renvoient tous 404.

### Correction par rapport au plan

`build-plan.md` dit qu'il faut « créer des produits et des prix Stripe ». Ce
n'est pas nécessaire. Le frontend utilise `PaymentElement` +
`stripe.confirmPayment()` (`src/components/CheckoutForm/CheckoutForm.jsx`), donc
un flux **PaymentIntent**. Les produits et prix du dashboard ne servent qu'aux
flux Checkout et Subscriptions. Il faut seulement :

1. la clé secrète Stripe (`STRIPE_SECRET_KEY`) dans l'env backend ;
2. un endpoint webhook déclaré dans le dashboard, et son secret de signature
   (`STRIPE_WEBHOOK_SECRET`).

La clé publiable est déjà côté frontend dans `VITE_STRIPE_PUBLISHABLE_KEY`.

### Le point non négociable : le montant vient du serveur

Aujourd'hui `CheckoutForm.jsx:39-42` envoie `{ title, amount: price }` à
l'endpoint externe, donc **le client choisit ce qu'il paie**. La nouvelle route
ne doit accepter que l'identifiant de l'offre et relire le prix en base.

C'est la seule vraie frontière de confiance de cette feature : tout le reste est
du confort.

### Contrat demandé

**`POST /payments/intent`** (nom indicatif, à toi de trancher), authentifiée.

| Aspect | Contrat |
|---|---|
| Body | `{ "offerId": "<ObjectId>" }`, rien d'autre |
| Réponse 200 | `{ "clientSecret": "pi_..._secret_...", "amount": <entier centimes>, "currency": "eur" }` |
| Montant | recalculé serveur : `offer.price` + frais, jamais lu dans le body |
| Sans token | 401 |
| Offre inexistante | 404 |
| Offre pas `available` | 409, avec un `message` affichable |
| Acheteur = propriétaire | 403 |
| `offerId` malformé | 400, comme les autres params |

Le frontend lit déjà `response.data.client_secret` ; je le renommerai en
`clientSecret` de mon côté, ou dis-moi si tu préfères garder le snake_case de
Stripe.

### Les frais, à décider

`src/pages/Payment/Payment.jsx:33-42` code en dur **0,40 € de protection
acheteur** et **0,80 € de frais de port**, et affiche `price + 0.4 + 0.8`.

Si le backend calcule le montant sans connaître ces constantes, l'utilisateur
voit un total et se fait débiter d'un autre. Il faut donc que **les frais vivent
côté backend**, et que la réponse renvoie le détail pour que l'écran l'affiche :

```json
{
  "clientSecret": "...",
  "currency": "eur",
  "breakdown": { "item": 4590, "protection": 40, "shipping": 80 },
  "amount": 4710
}
```

Tout en centimes entiers, jamais en flottants (`45.9 * 100` vaut
`4589.999...` en JavaScript).

### Cycle de vie du statut de l'offre

L'enum `status` existe déjà (`available | reserved | sold`). Proposition :

| Événement | Effet |
|---|---|
| PaymentIntent créé | `available` vers `reserved` |
| Webhook `payment_intent.succeeded` | `reserved` vers `sold` |
| Webhook `payment_intent.payment_failed` ou `canceled` | retour à `available` |
| Intent abandonné (pas de webhook) | prévoir une expiration, sinon l'offre reste bloquée en `reserved` |

**C'est une décision produit, pas une évidence.** L'alternative est de ne rien
réserver et de passer directement en `sold` au webhook : plus simple, mais deux
acheteurs peuvent payer la même offre. Vu que c'est un projet d'apprentissage,
la version simple est défendable. Dis-moi laquelle tu prends, je câblerai le
frontend en conséquence (la feature 18 affiche déjà le badge et désactive
« Acheter » quand l'offre n'est pas `available`, donc les deux marchent sans
travail front supplémentaire).

### **`POST /payments/webhook`**, publique

- Vérifier la signature avec `STRIPE_WEBHOOK_SECRET`. Sans ça, n'importe qui
  peut marquer une offre vendue.
- **Piège classique** : la vérification a besoin du corps brut. Il faut monter
  `express.raw({ type: 'application/json' })` sur cette route seule, avant le
  `express.json()` global, sinon la signature ne validera jamais.
- Répondre 200 vite, traiter ensuite. Stripe rejoue en cas de timeout.
- Rendre le traitement idempotent : le même événement arrive plusieurs fois.
- Elle doit rester hors de la restriction CORS `origin: FRONTEND_URL` : l'appel
  vient de Stripe, pas du navigateur.

### Critères d'acceptation suggérés

- `POST /payments/intent` sans token : 401.
- Avec token, offre `available` dont je ne suis pas propriétaire : 200, et le
  montant renvoyé vaut `offer.price * 100` plus les frais, quoi qu'envoie le client.
- Même appel sur ma propre offre : 403.
- Même appel sur une offre `sold` ou `reserved` : 409.
- Webhook avec une signature invalide : 400, et l'offre ne bouge pas.
- Webhook `succeeded` valide : l'offre passe `sold`, et un rejeu du même
  événement ne change rien.

## Demande 2 : param `status` sur `GET /offers` (features 23, 26, 27)

**Toujours pas implémentée.** Vérifié : `GET /offers?status=sold` répond 400
`{"message":"\"status\" is not allowed"}`, y compris authentifié avec
`?owner=<moi>`.

Le contrat complet, les cas limites et le raisonnement sont déjà écrits dans
[`backend-request-owner-status.md`](backend-request-owner-status.md). Rien à
ajouter ici, c'est juste un rappel qu'elle est en attente.

En résumé : `status=available,sold` en liste séparée par des virgules, accepté
seulement si `owner` vaut l'utilisateur authentifié, défaut inchangé.

## Demande 3 : changer son mot de passe en étant connecté (feature 24, conditionnelle)

Aucune route : `POST /users/password` et `POST /users/:id/password` renvoient
404. Le seul chemin qui change un mot de passe aujourd'hui est le flux « mot de
passe oublié » (`/users/reset/request` puis `/users/reset/confirm`).

**À ne faire que si tu veux vraiment ce bouton dans la page profil.** Une page
profil sans changement de mot de passe est parfaitement cohérente : l'utilisateur
passe par « mot de passe oublié ». C'est la solution à zéro travail backend, et
c'est celle que je recommande pour un projet d'apprentissage.

Si tu la veux quand même, le minimum est : route authentifiée, exigeant
**l'ancien mot de passe** en plus du nouveau (sinon un token volé suffit à
verrouiller le compte), et invalidant les refresh tokens existants.

## Conséquence côté frontend, pour mémoire

Indépendamment du backend, `src/pages/Payment/Payment.jsx:11` fait
`const { price, title, id } = location.state` sans garde. Ouvrir `/payment`
directement plante la page avant même le test du token. À corriger côté
frontend quand la feature 6 sera câblée, ce n'est pas une demande backend.
