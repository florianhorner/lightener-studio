# Native color-temperature mapping exploration

Captured on 2026-07-24.

Status: exploratory. These mockups are neither an approved design nor an
implementation specification. They preserve four interaction directions for
review while the feature semantics are still being designed.

## Semantic guardrails

- Home Assistant's native color-temperature input drives per-light Kelvin
  mapping.
- Brightness and color temperature are independent inputs.
- A brightness-only command must preserve the current color temperature.
- A command without a color-temperature input must preserve the current color
  temperature.
- Brightness-driven temperature behavior is excluded. Any future dim-to-warm
  behavior must be a separate, explicit opt-in feature.
- The proxy Kelvin state, heterogeneous bulb-range policy, and Adaptive
  Lighting behavior still require an implementation decision.

## Variants

- **A — Native Studio:** closest to the current Lightener editor and its
  graph-first structure.
- **B — Room First:** leads with the room's requested Kelvin and reveals member
  calibration beneath it.
- **C — Calibration Canvas:** makes heterogeneous bulb ranges and clamping most
  explicit.
- **D — One input, one light:** a minimal direct-manipulation workbench focused
  on one member curve at a time.

Open [the comparison board](./design-board.html) to switch among all four
interactive variants. Static captures are under [`screenshots/`](./screenshots/).

## Local preview

From the repository root, run:

```sh
scripts/preview-color-temperature-designs
```

The script binds only to localhost and prints the exact preview URL. It uses
`CONDUCTOR_PORT` when available and otherwise falls back to port `8000`.

The existing `docs/color-temp-demo.html` is not part of this exploration. It is
a public GitHub Pages artifact with obsolete brightness-driven dim-to-warm
semantics and requires a separate removal or replacement decision.
