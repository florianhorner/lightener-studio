# Open Room Lab

**Tell us what your lights did when you turned the dial.**

Lightener Studio is a curve editor, but nobody wants a curve. People want the
corner lamp to stay a soft glow while the ceiling comes up, or the kitchen to
stop jumping from off to interrogation. The Open Room Lab is where you say what
you wanted your room to do, what shape you drew, and what the lights did.

The whole thing is this page and two GitHub Discussions. No separate signup: you
post with the GitHub account you already have.

- **Try it with no install:** [live demo](https://florianhorner.github.io/lightener-studio/)
- **Install it in Home Assistant:** search HACS for **Lightener Studio** from
  `florianhorner/lightener-studio`, then follow [Installing](https://github.com/florianhorner/lightener-studio#installing)
  to download it and create your first group.

---

## Where things stand

*Release, source and demo-bundle status last checked: 2026-10-18. HACS client discovery and fresh installation have not been verified here.*

Every row below can change, so every row carries a link you can check yourself.
The block gets refreshed on a stable release, a demo deployment, or a change in
HACS state. **If today is more than 30 days past the date above, treat it as
*status may be stale, check the source*, and trust the links over the prose.**

| What | Where it stands | Check it yourself |
|---|---|---|
| Latest stable release | `v2.17.3`, published 2026-08-25 | [releases/tag/v2.17.3](https://github.com/florianhorner/lightener-studio/releases/tag/v2.17.3) |
| Latest beta release | `v2.18.0-beta.1`, published 2026-10-17; Joy is opt-in on dashboard cards and absent from stable 2.17.3 | [releases/tag/v2.18.0-beta.1](https://github.com/florianhorner/lightener-studio/releases/tag/v2.18.0-beta.1) |
| Version declared by the served demo bundle | `2.17.3` (`__LIGHTENER_CURVE_CARD_VERSION__ = "2.17.3"`); browser interaction has not been checked here | [the demo bundle itself](https://florianhorner.github.io/lightener-studio/lightener-curve-card.js) |
| Source vs. release | `master` may run ahead of the last stable tag | [what's on master since v2.17.3](https://github.com/florianhorner/lightener-studio/compare/v2.17.3...master) |
| How you install it | Search HACS for **Lightener Studio** (`florianhorner/lightener-studio`); custom-repository setup remains a fallback if the listing has not reached your client | [Installing](https://github.com/florianhorner/lightener-studio#installing) |
| HACS default store | **Submission merged 2026-10-18.** Catalog propagation and discovery in a client remain unverified here; the original `fredck/lightener` is also listed | [hacs/default#8892](https://github.com/hacs/default/pull/8892) |
| Minimum Home Assistant | 2024.8.0 | [`hacs.json`](https://github.com/florianhorner/lightener-studio/blob/master/hacs.json) |
| Something went wrong | Upgrade and caching recovery guide | [docs/TROUBLESHOOTING.md](https://github.com/florianhorner/lightener-studio/blob/master/docs/TROUBLESHOOTING.md) |

The demo version and the stable release are listed separately on purpose. A
release deploys the demo, so the demo can lag. When the two rows disagree,
you are looking at older behaviour, and that gap is worth reporting.

## What works today

- **Per-light brightness shapes.** You drag the shape for each light; the group
  dial drives all of them through it.
- **Live response in the room** while you shape, with the lights restored when
  you stop.
- **A brightness scrubber** that shows how bright each light will be.
- **Shapes:** Equal brightness, Dim accent, Late starter, Night mode, applied
  to the selected light.
- **A sidebar panel** at `/lightener-editor`, so you can edit without adding a
  dashboard card first.

## What it doesn't do

- **Color temperature is not a feature.** There is an exploratory
  [warmth-curve demo page](https://florianhorner.github.io/lightener-studio/color-temp-demo.html),
  and it is only an exploration. Nothing in the integration writes color
  temperature. There is no release date, and this page is not a promise of one.
- **Brightness is the only axis.** Curves shape brightness, not transitions or
  scenes.
- **Large groups are unproven past roughly 20 lights.** The editor is built and
  tested for 2 to 20. Past that, a report is useful data.

---

## The Room Proof report

This is the whole contribution. Copy the block, fill it in, and post it (see
[Where to post](#where-to-post)). Skip any line that doesn't apply; a partial
report beats no report. **Read [the privacy rules](#privacy-rules) first.**

```text
Room Proof

Room: <living room, bedroom, kitchen, hallway, office>
What I wanted the room to do:
  <e.g. "stay warm and low after 10pm without going black">

Lights: <how many>
  Light A: <role, e.g. ceiling / accent lamp / LED strip>
  Light B: <role>
  Light C: <role>
  (use A/B/C labels, not your real entity names)

Home Assistant version: <e.g. 2026.7.1>
Lightener Studio version: <e.g. 2.17.3>
Installed via: <HACS search / HACS custom-repository fallback / demo only>

Shape I tried: <shape name, or "drew my own", or "none yet">

What the room did:
  At 10%    expected: <...>    observed: <...>
  At 40%    expected: <...>    observed: <...>
  At 100%   expected: <...>    observed: <...>

Worked: <the one thing that came out right>
Confusing: <the exact moment you were unsure what would happen>
Broke: <what failed, and what you did right before it>

Privacy: I checked this report and it contains no names, addresses,
entity IDs, floorplans, camera images, network details, or credentials.
```

A cropped or blurred photo, or a before/after pair, is welcome and never
required.

Post it even when nothing broke. "This is what I wanted and this is what
happened" is the sentence nobody thinks to send.

### Privacy rules

Home Assistant reports leak houses. The rules below cover text, screenshots,
and logs alike.

**Never post:**

- your name, household members' names, your address, or your town
- real entity IDs or device IDs (`light.emmas_bedroom` names a person and a
  room; use `Light A`)
- floorplans, room layouts, or anything showing the shape of your home
- camera frames or any photo with a person, a window view, or a document in it
- IP addresses, hostnames, Nabu Casa URLs, SSIDs, or network topology
- tokens, passwords, or access credentials of any kind, expired or not
- raw log dumps. Read every line and replace the identifying parts before
  pasting; a stack trace usually carries entity IDs and paths through it.

**If you posted a token, password, or any other credential, revoke and rotate it
right now.** Do not wait for the post to come down. Taking a post down is not the
same as making it unseen.

Beyond that: a sensitive post will be hidden or deleted wherever permissions
allow, and you will be asked for a sanitized replacement. The request itself
won't quote or screenshot what you posted. But be clear-eyed about the limits of
that, because they are not ours to remove. GitHub keeps an edit history on
comments, notification emails may already carry the original text, and anyone who
read the post may have copied it. Deletion reduces exposure; it does not undo it.

If you spot your own mistake first, say so. It gets handled the same way, and
catching it costs you nothing.

### Where to post

Use the channels that already exist:

| What you have | Where it goes |
|---|---|
| A room that worked, or a subjective "is this shape right?" question | [Discussion #136: Show your curves](https://github.com/florianhorner/lightener-studio/discussions/136) |
| A setup or first-run question | [Discussion #137: Start here, setup & first questions](https://github.com/florianhorner/lightener-studio/discussions/137) |
| A reproducible defect, with steps | [Open an issue](https://github.com/florianhorner/lightener-studio/issues/new/choose) |

If you're not sure which, post in [#137](https://github.com/florianhorner/lightener-studio/discussions/137).
Sorting it is not your job.

Reports about the **stock Lightener integration's own behaviour** (grouping,
YAML config, the underlying light entity) belong
[upstream at fredck/lightener](https://github.com/fredck/lightener). This
project extends that integration; it does not speak for it.
