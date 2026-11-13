# Hero art direction: the intent handoff

## Why change it

The current lock-screen illustration is recognisable, but its largest detail
is a clock. It spends more visual weight on phone hardware than on the part
that makes FEX different: someone compared real rates, chose a plan and told
us why they are buying. On a narrow screen, the clock appears before any of
those useful details.

Keep the promise, email capture and evidence in charge. Let the art make
“Real Intent” tangible without becoming another headline or pretend app demo.

## References, not templates

Reviewed the public Telnyx and GitHub homepages on 2026-11-13.

- **Telnyx:** thin-edged objects and open space explain its actual infrastructure.
  Take the idea of a product-specific visual story, not its black ground,
  isometric nodes, brand colours or many connections.
- **GitHub:** the current homepage gives the signup clear priority and uses a
  small authored character reveal at the hero seam. Take its hierarchy and
  personality, not the character or identity.
- **FEX's own deviation:** editorial quote-paper and a single handoff, rather
  than a hardware render, mascot or infrastructure network.

## Three directions considered

| Direction                        | What the visitor sees                                                                   | Trade-off                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Intent handoff (implemented)** | A shopper's selected quote becomes a compact agent notification.                        | Best balance of informed intent and delivery. Needs careful overlap so no key detail disappears. |
| Marked quote                     | One editorial quote sheet with a selected plan and buying reason, no receiving surface. | Quietest and most print-like, but delivery becomes less obvious.                                 |
| Quote-to-conversation line       | A custom-drawn line carries premium, plan and purpose into a speech contour.            | Lightest and most abstract, but easier to mistake for generic automation art.                    |

## Implemented composition

One authored paper object, with one shallow backing edge and a folded corner,
a marked selection and a clear human reason. A dashed hairline leads to a
single FEX delivery slip. Ink, slate, hairlines and the existing local type
make it part of this page rather than a new visual identity.

- No device bezel, date, giant time, fake Call now button, dashboard collage,
  glowing background or looping motion.
- The example's $25,000 coverage, $68 monthly premium and legacy reason come
  from the existing fictional Website-lead
  illustrations. They are not current rates or an issued policy.
- The art labels itself as an example quote record and illustrative Website
  lead. Phone verification is a detail of this example, not a claim that
  every Website lead is verified. No real customer data or live activity.
- On compact columns, including small desktop split layouts, redraw the
  object rather than scaling down the desktop arrangement. Hide the secondary
  carrier descriptor, retain purpose, premium, coverage and phone-verification detail.
  Dock the smaller receiving slip beneath them. The scene is 286px high.
- The connector is a 0.75px, round-capped dashed hairline. Its final portion
  resolves into one continuous stroke at the receiving slip: considered
  intent becomes a connection. This small FEX-specific detail is static,
  with no trace, loop or pulse. Both motion preferences show the complete art.

## Scope

Only the hero artwork and its surrounding bottom spacing change. Headline,
description, signup/access-request flow, proof, integrations, routing, other
sections and shared theme remain unchanged. No new runtime dependency,
video, image download, analytics or backend work.

## Review checklist

1. Read the headline and find Get access before looking at the artwork.
2. The object reads as a quote record, not an insurance policy or CRM product.
3. The selected plan and human reason remain legible without animation.
4. No text is hidden by the overlapping slip at supported widths.
5. The actual form still opens the request dialog with the email retained.

Run `client/scripts/test_landing_hero.py` against a local Vite preview for the
responsive, motion, overlap, accessible-description and signup regression
checks. See the script header for setup; all non-local traffic is blocked.

For scoped JSX lint (the repository's default ESLint config targets TS/TSX):

```sh
cd client
npx eslint --config scripts/hero-eslint.config.mjs src/views/Landing.jsx src/views/landing/HeroHandoff.jsx
```

Browser checks default to Chromium; pass `--browser webkit` or `--browser firefox`
after installing that Playwright engine. In the dummy-auth local fixture,
Firefox reports the same Supabase Navigator LockManager exception on the base
and the candidate. That browser's full-app check is therefore not counted as
passing. This change does not alter authentication.
