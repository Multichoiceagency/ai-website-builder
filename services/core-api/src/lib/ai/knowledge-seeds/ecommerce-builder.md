# Ecommerce builder

Sites have a `kind`: `website` or `ecommerce`.

Ecommerce sites use a separate store builder flow (Amazon/AliExpress-style product
grids, shop announce header, product cards). Starter catalogue products can be seeded
during onboarding.

## Guidance for the assistant
- For shop layouts, prefer ecommerce-oriented blocks (`header-shop-announce-01`, product grids).
- Do not invent product SKUs or prices — use placeholder props or point to Commerce settings.
- Scroll-scrub product stories use block `scroll-video-scrub-01` after uploading a video in Media
  (frames extract automatically).
- Header/footer chrome still apply on ecommerce sites the same way as websites.
