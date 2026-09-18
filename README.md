# Vinted Frontend

[![Verify](https://github.com/dan0203/vinted-frontend/actions/workflows/verify.yml/badge.svg)](https://github.com/dan0203/vinted-frontend/actions/workflows/verify.yml)

Clone du site de vente de vêtements d'occasion Vinted : parcours des annonces,
publication d'un article, favoris, et paiement via Stripe. Projet frontend
uniquement ; l'API consommée vit dans un dépôt backend séparé.

## Stack

- React 19 + Vite
- `react-router` v7 pour le routage
- `axios` pour les appels HTTP, `js-cookie` pour le token d'authentification
- `@stripe/react-stripe-js` pour le paiement
- CSS plain par composant, pas de framework CSS ni de librairie de state
  globale
- ESLint + Prettier, GitHub Actions (`yarn verify`) sur les PR et `master`

## Lancer le projet

```bash
yarn install
yarn dev       # http://localhost:5173
```

Variables d'environnement attendues dans `.env` (voir `.env.example` si
présent) : `VITE_API_URL`, `VITE_STRIPE_PUBLIC_KEY`.

## Choix d'architecture

Ce projet est un portfolio, pas un service qui doit encaisser le trafic réel
de Vinted. Les choix ci-dessous sont volontairement dimensionnés pour son
échelle actuelle (un frontend simple, quelques pages, un seul développeur) et
documentés ici pour expliciter le raisonnement plutôt que de le deviner en
lisant le code.

- **Pas de librairie de state global ni de data-fetching (Redux, React
  Query...)** : chaque page ne fetch qu'une ressource qui lui est propre, sans
  recouvrement entre routes ni besoin de cache partagé. `useState` /
  `useEffect` suffit à couvrir les besoins actuels sans ajouter une dépendance
  ni une couche d'abstraction supplémentaire à maintenir.
- **Pas de pagination serveur sur la liste d'annonces** : le volume de données
  de démo reste faible. C'est le premier point qui deviendrait un vrai
  problème avec un catalogue plus large ; voir "Ce qui changerait à l'échelle"
  ci-dessous.
- **Axios plutôt que `fetch`** : parsing JSON automatique et gestion d'erreurs
  plus simple pour ce volume d'appels, sans bénéfice à changer pour l'instant.

Le principe suivi est celui de l'ingénierie proportionnée : construire pour
les besoins établis, pas pour une échelle hypothétique. Ce n'est pas un
raccourci pris par méconnaissance des alternatives, mais un choix délibéré :
sur-architecturer un projet de cette taille (cache distribué, state manager,
micro-services) enverrait un signal moins juste sur le jugement technique
qu'un code proportionné à son contexte réel.

### Ce qui changerait à l'échelle (si projet réel)

Si ce projet devait un jour gérer un trafic et un catalogue réels, les
premiers changements seraient :

- **Pagination / scroll infini côté API** pour la liste d'annonces (`Home`),
  plutôt que de tout charger en un seul appel.
- **Cache et déduplication des requêtes** (React Query ou équivalent) dès que
  plusieurs pages partageraient des données ou que des refetch redondants
  apparaîtraient en navigation.
- **CDN / cache HTTP** pour les images produit et avatars, servis directement
  depuis le stockage aujourd'hui.
- **Observabilité** (logging structuré, suivi d'erreurs) en remplacement des
  `console.log` actuels, qui suffisent pour du développement local mais pas
  pour du run en production.

## Structure

```
src/
  components/   composants réutilisables (Name/Name.jsx + Name.css)
  pages/        pages routées (Name/Name.jsx + Name.css)
  App.jsx       déclaration des routes (react-router v7)
```

## Tests

- `yarn lint` : lint ESLint
- `yarn verify` : build (exécuté en CI sur les PR et `master`)
- `yarn test:browser` : tests Playwright (`tests/browser/`), non inclus dans
  `yarn verify` / CI
