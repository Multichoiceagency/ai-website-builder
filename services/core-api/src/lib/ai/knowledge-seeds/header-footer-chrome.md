# Header and footer chrome

Each site can have dedicated Header and Footer chrome pages (role `header` / `footer`).
They are edited in the dashboard Header/Footer editors and composed at render time —
they are not public `/header` routes.

## Header blocks
- `header-simple-01` — logo / wordmark, links, CTA, sticky; props include `logo`, `logoHeight` (`sm`|`md`|`lg`|`xl`), `layout`, `links`, `brand`.
- `header-liquid-glass-01` — cinematic glass chrome for Motionsites islands; same `logoHeight` prop.

## Logo size
Use assist action `setHeaderLogoSize` with `sm`, `md`, `lg`, or `xl` to change `logoHeight`
on all `header-*` sections. Do not tell the user to open the inspector unless no header exists.

## Footer
Footer chrome uses footer blocks on the site footer document. Prefer patching section props
or inserting a footer block rather than inventing markup.
