# Red Command Ledger Design

## Purpose

Restyle the Dead Hand personal-safety frontend as a hardened command-post interface. It should communicate readiness, urgency, and operational clarity without political slogans, party symbols, or ideological messaging.

## Direction

Use the **Industrial** visual anchor: warm-black surfaces, monospaced typography, flat 1px steel-red borders, square controls, tabular numbers, and one signal colour: alarm red. The existing safety-state colours remain semantic, but red becomes the dominant visual signal throughout the product.

## Signature Move

Every primary screen uses a narrow vertical readiness rail. It is subdued during monitoring and becomes brighter in alarm states, giving the layout a memorable command-strip silhouette without adding decorative copy or fake telemetry.

## Scope

- Replace the favicon with a custom geometric red beacon mark and update the HTML icon metadata.
- Retokenize global CSS around warm black, steel grey, alarm red, and restrained off-white text.
- Add scanline and restrained instrument-grid texture while preserving contrast and reduced-motion support.
- Restyle landing, authentication, navigation shell, panels, controls, countdowns, and active states around the readiness rail and flat industrial surfaces.
- Keep existing product strings and real state data; do not add political or fabricated operational content.

## Constraints

- Frontend remains client-only and uses Edge Functions for application data.
- Existing Q0-Q4 automaton behaviour and semantic alarm-state names remain unchanged.
- Favicon is a repository-native SVG asset, not an externally sourced image.
- Preserve responsive mobile navigation and keyboard-accessible controls.

## Verification

- Run TypeScript, Vitest, production build, lint, and `git diff --check`.
- Visually inspect the landing, auth, and authenticated console at desktop and mobile widths.
