# Create-flow UX personas (audit cast)

Use these ten people to judge `/website/new` (Lovable-style: “What do you want to build?”).
Primary bar: **can they finish Build without help in under 2 minutes?**

## Core (IQ ≤70 / low literacy)

### 1. Sam — Bakery owner, 52
- Reads slowly; skips long text.
- Needs one obvious button and plain words.
- Goal: website for Sunny Bakery.
- Fail if: jargon, multi-step wizard, unclear Website vs Webshop.

### 2. Lea — Phone-first, 28
- Thumbs only; ignores small links and footnotes.
- Taps the biggest control first.
- Goal: any working site from an example chip.
- Fail if: tiny tap targets, ⌘Enter as the only way, desktop-only hints.

### 3. Omar — English as second language, 41
- Speaks Dutch daily; English UI is hard.
- Goal: NL site for his plumbing business.
- Fail if: English-only labels, no NL language control.

### 4. Rita — Anxious first-timer, 63
- Afraid of “breaking something.”
- Needs reassurance and an undo/back path.
- Goal: try an example, then Build.
- Fail if: scary errors, no loading status, no way back from blank mode.

## Adjacent (still need extreme clarity)

### 5. Jordan — ADHD, 24
- Scans, abandons if >1 decision before typing.
- Goal: type idea → Build in one screen.
- Fail if: mode picker before the prompt, extra style steps.

### 6. Mei — Busy parent, 35
- 60 seconds between school runs.
- Goal: webshop for homemade soap.
- Fail if: must visit another page for shop, unclear Webshop toggle.

### 7. Theo — Low vision, 70
- Needs large text, strong contrast, clear focus.
- Goal: read headline + Build without squinting.
- Fail if: faint placeholders, low-contrast chips, tiny NL/EN.

### 8. Noor — Non-technical freelancer, 31
- Knows Instagram, not “CMS / slug / locale.”
- Goal: portfolio website from a short sentence.
- Fail if: technical terms in UI or errors.

### 9. Diego — Mobile data, flaky network, 29
- May get a slow or failed Build.
- Goal: understand error and retry.
- Fail if: silent failure, lost prompt text, no retry path.

### 10. Aisha — Agency junior, 22 (power-user check)
- Wants speed and keyboard shortcut.
- Goal: ⌘Enter after pasting a brief; optional blank site.
- Fail if: blank path is gone, or AI path is slower than needed.

## Pass criteria (team scorecard)

| Check | Pass |
| --- | --- |
| Time to first Build click | ≤ 30s with example, ≤ 90s from scratch |
| Decisions before typing | ≤ 2 (kind + language optional) |
| Reading level of primary UI | Grade ~5 / short sentences |
| Mobile usable | Build + examples without horizontal scroll |
| Recovery | Error names problem + keep prompt; blank has Back |
| Website vs Webshop | Clear without reading a paragraph |

## Audit results (2026-08-10) — 10-persona team

Round 1 verdict: **conditional fail** (structure good; copy/a11y/feedback gaps).

Top fixes applied in `/website/new`:
1. Build always clickable → validates with plain message; helper when short
2. Focus rings + larger taps + stronger chip contrast
3. Retry button + friendlier network errors
4. Dynamic CTA (“Maak mijn website/webshop”) + Back (not “Back to AI”)
5. sessionStorage draft + slow-network hint after 10s
6. Full NL/EN UI strings tied to language toggle
7. Examples moved above the textarea; Dutch examples when NL
8. Sticky full-width Build on mobile
9. Softened wait copy + “you can change later”

Re-test bar: core personas Sam/Lea/Omar/Rita should **PASS** example path & scratch path in NL.
