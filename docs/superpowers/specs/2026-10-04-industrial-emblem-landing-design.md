# Industrial Emblem Landing Page Design

## Context

Soviet Dead Hand is a personal-safety setup product for check-ins, trusted contacts, device telemetry, and emergency escalation. The landing page currently communicates the product through a dense industrial command-board treatment, but the hero and supporting sections need a clearer visual hierarchy and a more deliberate relationship to the existing emblem asset.

The design problem is to make the emblem the page's memorable visual anchor while keeping the product framed as defensive personal safety, not as a political or ideological experience.

## Direction

Use the **Industrial** anchor from the frontend-design system. The surface remains warm-black `#0B0C0A`, typography is monospace throughout, the single semantic signal is red `#FF3B30`, and structure is built from flat 1px rules rather than rounded cards or decorative shadows.

The editorial/specimen composition from the earlier concept is retained as the differentiator: the emblem is presented as a large, cataloged system specimen with measured alignment, registration marks, and restrained metadata. This is an editorial layout treatment inside one Industrial visual system, not a light-theme hybrid.

## Content stance

- Public-facing copy is English-first.
- The emblem is described as a historical graphic reference and visual motif only; no copy should imply political affiliation or ideological endorsement.
- Product copy must name real capabilities: setup, sign-in, trusted contacts, connected devices, check-ins, and emergency escalation.
- Standard interface actions remain standard: `Sign in`, `Begin setup`, and similar labels should not be replaced with themed language.
- The safety disclaimer remains explicit: the product is not a replacement for calling emergency services.
- Avoid fabricated telemetry, fake operator identities, pseudo-system readouts, and decorative labels that do not provide information.

## Page structure

### 1. Header

Keep a compact top bar with the product name, a small numbered mark, and a `Sign in` link. The header uses a bottom rule and stays visually subordinate to the hero.

### 2. Hero

Use a responsive two-column composition on larger screens and a single-column stack on small screens.

- Left: English headline, one-sentence defensive product description, `Begin setup` CTA, and a compact facts row describing actual routes or product stages.
- Right: a large emblem specimen plate using the existing image asset. The plate includes a title row, the emblem at generous scale, crosshair/registration details, and a footer that identifies the system as safety-only.
- The red accent should be concentrated in the headline accent, CTA, emblem metadata, and status emphasis rather than spread across every element.

### 3. Setup path

Retain the setup overview but simplify its hierarchy. Show the four real setup areas—access credentials, primary handset, emergency contacts, and optional wearable bridge—as a readable progression. Required versus recommended status should remain explicit.

### 4. Escalation states

Retain the Q0–Q4 doctrine as an explanatory product model, not as fabricated live telemetry. Each state should have a short English title and a concise explanation of what the system does at that stage. Red should mark attention and escalation states; neutral text should carry monitoring and explanatory states.

### 5. Footer

Keep the short safety disclaimer in a ruled footer. It must remain legible at mobile widths and must not be hidden behind decorative treatment.

## Visual system

```css
--background: #0B0C0A;
--signal-red: #FF3B30;
--foreground: #F2F0E9;
--muted-foreground: #959A91;
--border: #3A4038;
--panel: #0E100D;
--card: #121411;
```

- Use JetBrains Mono, ui-monospace, or another monospace fallback for all rendered text.
- Keep corners square and surfaces flat.
- Use 1px rules, inset scanline treatment where it already supports the industrial surface, and tabular numerics for codes and route markers.
- Preserve the warm-black background and avoid white surfaces, warm paper, serif display type, gradient backgrounds, or soft shadows.
- Maintain accessible contrast, visible keyboard focus, readable line lengths, and reduced-motion behavior.

## Implementation boundaries

- Modify the public landing route and its landing-specific styles only unless a shared primitive must be adjusted to preserve the existing visual system.
- Preserve TanStack Router paths and existing authentication/setup behavior.
- Reuse the existing emblem asset at `frontend/public/c4ff83c5eadddc1a6627fbce57d559e0.png`.
- Do not change Supabase, Android, or post-auth flows.
- Do not remove existing test coverage. Update tests only where the landing page's intentional copy or structure changes require assertions to be revised.

## Verification

The affected frontend checks are the blocking gate:

1. `npm test -- --run` from `frontend/`
2. `npm run lint` from `frontend/`
3. `npm run build` from `frontend/`

Targeted landing tests should run first if updated. A final implementation is not complete until all three frontend CI-equivalent commands pass with fresh output. The Android lane is out of scope for this visual-only change and should not be modified.

