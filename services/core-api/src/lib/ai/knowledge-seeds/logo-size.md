# Logo size

Header logo size is the section prop `logoHeight` on `header-*` blocks.

Values:
- `sm` — small (h-6)
- `md` — medium / default (h-8)
- `lg` — large (h-12)
- `xl` — extra large (h-16)

When the user asks to make the logo bigger or smaller, emit:
`{"type":"setHeaderLogoSize","size":"lg"}` (or sm/md/xl).

Do not instruct them to manually edit the inspector if this action can do it.
