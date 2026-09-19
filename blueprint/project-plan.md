# Project Plan

## 1. Problem - What problem are we solving?

A secondhand clothing marketplace (Vinted-style): users browse, publish, buy,
and sell used clothing items. This is a learning/portfolio project, not a
production business.

## 2. Users - Who is this for?

Learners/portfolio reviewers evaluating the app, and simulated buyers/sellers
used to exercise the full flow (signup, publish, browse, favorite, buy).

## 3. Features - What does the MVP need?

Le socle est en place : parcours et détail des offres sur le contrat backend
actuel, signup/login avec confirmation de compte et réinitialisation du mot de
passe, session à jeton d'accès en mémoire plus cookie de rafraîchissement
httpOnly, publication multi-images, recherche/filtres/tri/pagination, statut
des offres, galerie, et favoris (build-plan items 1-5 et 7-21).

La session est glissante et sans plafond absolu : elle reste vivante tant que
l'utilisateur revient au moins une fois dans la fenêtre du cookie de
rafraîchissement, et elle se prolonge à chaque visite. Choix assumé pour une
marketplace grand public sans données de paiement en session, où déconnecter un
utilisateur actif n'achèterait aucune sécurité. Le serveur décide seul de la
fréquence de rotation du jeton. Le cookie étant httpOnly, le frontend ne peut
pas observer la différence.

Reste à faire, par ordre de dépendance : restaurer la session au chargement de
la page (item 28, qui débloque tout ce qui est authentifié), la page Mes
favoris (22), l'édition/suppression/changement de statut des offres possédées
(23), les pages de profil (24-25), et « Mes offres » (26-27).

Deux chantiers dépendent du backend et ne sont pas spécifiables aujourd'hui :
le paiement Stripe réel (item 6 - `CheckoutForm.jsx` appelle encore un endpoint
de test externe, et `vinted-backend` n'a aucune route de paiement), et « Mes
offres » (item 26 - il faut d'abord un filtre `owner` sur `GET /offers` ou une
route `GET /users/:id/offers`). Liste ordonnée complète dans `build-plan.md`.

## 4. Data - What are we storing?

Owned by the separate backend (`vinted-backend`), not this repo:

- **Users/accounts**: username, email, password (hashed), avatar, newsletter
  opt-in, confirmation status, favorites.
- **Offers**: name, description, price, details (brand, size, color,
  condition, city), image, up to 5 secondary pictures, status
  (available/reserved/sold), owner.
- **Payments**: to be handled via Stripe (PaymentIntents + a webhook) once a
  payment route is added to `vinted-backend`; not implemented yet (build-plan
  item 6). Not persisted in this repo either way.

## 5. Tech - What stack are we using?

- **Frontend (this repo)**: Vite + React 19, react-router 7, axios, js-cookie,
  react-icons, Stripe (`@stripe/react-stripe-js`, `@stripe/stripe-js`).
- **Backend**: separate repo, [vinted-backend](https://github.com/dan0203/vinted-backend).
  This Blueprint instance manages only the frontend; backend route/contract
  changes are tracked here as frontend work to adapt to, not implemented here.

## 6. Monetize - How will this make money?

Not applicable - learning/portfolio project, no monetization planned.

## 7. UI/UX - How should this look and feel?

French-language UI, minimalist marketplace look inspired by Vinted (hero
banner, card grid of offers, simple forms).

## 8. Deployment - Where and how will this ship?

> TODO (confirm): no deployment target chosen yet (candidates mentioned:
> Vercel or Netlify for this frontend). Run `/release` when ready to plan
> hosting (the backend deploys separately from its own repo).

Whichever host is chosen, `vinted-backend`'s `FRONTEND_URL` environment
variable (used in `cors({ origin: FRONTEND_URL, credentials: true })`) must be
updated to match this frontend's deployed origin, or the browser will not be
allowed to send/receive the httpOnly refresh-token cookie the new auth flow
depends on (see build-plan item 9).

## 9. Usage model and constraints (optional)

Small scale, single-tenant, non-adversarial, learning/demo context. No
compliance, availability, or audit requirements. Anonymous browsing is public;
publishing, buying, and favoriting require an authenticated account owned by
that user.
