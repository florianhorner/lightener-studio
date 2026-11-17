# Lightener Studio guide

The [front page](../README.md#installing) gets you from download to a first saved shape. This guide holds the detail behind it: the full walkthrough, what each part of the editor does, drafts and recovery, the dashboard card, updating and removing.

- [Installing in detail](#installing-in-detail)
- [Your first group](#your-first-group)
- [The first open: suggested shapes](#the-first-open-suggested-shapes)
- [Your first shape, step by step](#your-first-shape-step-by-step)
- [The editor](#the-editor)
- [Preview on lights](#preview-on-lights)
- [Drafts and recovery](#drafts-and-recovery)
- [Dashboard card](#dashboard-card)
- [Updating](#updating)
- [Removing Lightener Studio](#removing-lightener-studio)
- [Limits](#limits)
- [Need help?](#need-help)

## Installing in detail

The [front page](../README.md#installing) has the steps and the minimum Home Assistant version. What it leaves out:

- Installing and creating a group need a Home Assistant administrator account, and your lights should already work in Home Assistant.
- One light is supported too; two dimmable lights make the comparison easier.
- Install the latest regular release offered for Lightener Studio. Installing the files does not create a group. From Home Assistant 2026.11 the Marketplace opens setup right after, unless Home Assistant asks for a restart first. With HACS on Home Assistant 2026.10 or older, restart Home Assistant, then continue with [Your first group](#your-first-group).
- You can also [open Lightener Studio in the Marketplace](https://my.home-assistant.io/redirect/hacs_repository/?owner=florianhorner&repository=lightener-studio&category=integration) directly. The link was made for HACS and opens the repository in either. If the store does not know it yet, it can offer to add it; installing is still a separate step.

### If the search does not find Lightener Studio

Catalog updates can take time to reach your Home Assistant. See [Lightener Studio is missing from the Marketplace](TROUBLESHOOTING.md#lightener-studio-is-missing-from-the-marketplace) first.

If the listing is still unavailable: in the Marketplace choose **Add from link** and enter `florianhorner/lightener-studio`. In HACS, on Home Assistant 2026.10 or older, open the three-dot menu → **Custom repositories**, add `https://github.com/florianhorner/lightener-studio` as an **Integration**, then download Lightener Studio and restart Home Assistant. Neither way requires the original Lightener integration.

## Your first group

1. Open **Settings → Devices & Services → Add Integration**, search for **Lightener Studio**, and select it. You can also [open the setup directly](https://my.home-assistant.io/redirect/config_flow/?domain=lightener_studio).
2. Give the group a recognizable name, such as **Living room**. Leave **Narrow by area** empty for your first group to see all your lights.
3. Under **Lights to control**, choose the lights that should respond together. When you dim the group, its lights initially follow the group's brightness.
4. Review the optional details offered by your Home Assistant version, then finish setup using **Finish** or **Skip and finish**. Setup adds one new light named after the group. Use that light on dashboards and in automations; your single lights stay as they are.
5. Open the group's editor. Choose **Visit** on the group's device page, or open **Settings → Devices & Services → Lightener Studio** and choose **Configure** beside your group. Both open that group's editor at `/lightener-editor`.

To return later, use **Visit** or **Configure** again, or open **Lightener Studio** from the Home Assistant sidebar and select your group by name. **Configure** also works when the sidebar item is hidden. No dashboard card or YAML is needed.

**Visit** and **Configure** only choose which group opens first. The group switcher still lists every group and, for administrators, the **⋮** menu keeps **New group…**.

## The first open: suggested shapes

When an administrator opens a group in the sidebar editor and its shapes are still untouched, the editor draws a suggested shape for each light. Nothing is saved and nothing is sent to your lights.

**How the suggestion is made.** Each shape is guessed from the light's name, or from its entity ID when the name says nothing: Late for ceiling lights, Early for floor, table, desk, reading and bedside lamps, Dim for accents, Equal for the rest. A fan is always Equal. A suggestion needs at least two lights that do not all get the same shape.

**What you see.** The message line reads "Suggested shapes" over "Not saved. Nothing sent to your lights.", and the list's label reads "Lights · suggested". Room brightness is drawn at 30%, so the list shows what the room would do.

**What you can choose.**

- **Save these shapes** saves the suggestion and confirms it in the same place.
- **Keep all lights equal** leaves every light following the group's brightness. Escape does the same.
- Tapping a light, dragging a point or a light's bar, choosing **Edit** or switching **Preview on lights** on keeps the suggestion as your unsaved draft, with one Undo step back to the shapes from before.

Nothing is saved before **Save these shapes** or **Save**, and nothing is sent to a light unless **Preview on lights** is on.

**When it shows again.** While the group's shapes are still untouched, the suggestion shows each time you open the group in the sidebar editor as an administrator, until you answer it with one of its two buttons or Escape. Editing and then cancelling is not an answer. The answer is remembered per signed-in user and browser for each group. A group deleted and created again under the same name counts as a new group.

**When there is no suggestion.** An untouched group whose names give no suggestion shows a "Dim a bright light" tip once instead. The same tip follows **Keep all lights equal**. A group that already has saved shapes opens with neither.

**Asking for it later.** **Suggest shapes** in the **⋮** menu brings the suggestion back for administrators whenever the lights' names give one, also on dashboard cards and for a group that already has saved shapes. The item is unavailable when the names give no suggestion, when the suggestion equals the current shapes, and while a draft waits to be recovered. On a group with saved shapes the buttons read **Keep saved shapes** and **Edit suggested shapes**, which opens an unsaved draft, so one click never replaces saved shapes. Save or cancel a draft and turn off **Preview on lights** before asking. A dashboard card never shows suggested shapes by itself, and no YAML option turns that on.

## Your first shape, step by step

Try this with a lamp that overpowers the rest of the room:

1. If the editor shows suggested shapes, decide first. **Save these shapes** keeps the whole suggestion, and you can stop here. **Keep all lights equal** leaves every light following the group's brightness, so the steps below change only one lamp. If you tap a light instead, the suggestion becomes your unsaved draft and **Save** then saves all of it.
2. In **Lights**, select that lamp; this switches the editor to Edit. Choose the **Dim** shape (full name **Dim accent**). Its shape holds near 30% from halfway; only that lamp's shape changes. You can drag points to fine-tune it, but the starting shape is ready to save as it is.
3. To see the effect on your real lights, turn on **Preview on lights**, then move **Room brightness**. Compare the lamp with the other lights. This step is optional; leaving the preview off lets you inspect the graph without changing the room.
4. Choose **Save** in the header and wait for the saved confirmation; the editor then returns to View. Saving keeps the shape for future use. If the preview was on, saving also ends it and attempts to put the lights back where they were. Saving shapes and putting lights back have separate outcomes, and putting lights back is best-effort.
5. Reload the page, select the same group if needed, and confirm the lamp's shape is still there. Use the group's normal Home Assistant brightness control in daily use: its lights now follow their saved shapes.

Turning the **Preview on lights** switch off ends a preview without discarding your edits. **Cancel** discards unsaved edits. **Done** leaves Edit when nothing has changed and keeps the preview running.

## The editor

### View and Edit

The editor opens in View: the graph, Room brightness and the lights, with nothing to change by accident. Dragging a point or a light's bar, tapping a light, or choosing **Edit** switches to Edit, where **Done**, or **Cancel** and **Save**, sit in the header. Room brightness and **Preview on lights** work in View. One exception: if you switch **Preview on lights** on while suggested shapes show, the editor first keeps them as your unsaved draft and switches to Edit.

### The graph and the lights

- Drag points on the graph to shape each light's brightness response. **Undo** takes back changes before saving.
- Hover a light to pick out its shape on the graph. Tap the light to focus that shape, or drag its bar horizontally to edit the light at the current room brightness.
- Room brightness is the light edge on the graph. Drag the edge or its grip under the graph to explore existing shapes without changing them.

### Shapes

Four starting shapes apply to the selected light in Edit: Equal brightness, Dim accent, Early starter and Late starter. The chips read **Equal**, **Dim**, **Early** and **Late**. They sit under Room brightness; on wide sidebar panels, and on dashboard cards wide enough to show the lights beside the graph, they sit in the header.

- **Equal brightness** matches the group brightness.
- **Dim accent** holds near 30% from halfway.
- **Early starter** brings a light up sooner, then eases towards full brightness.
- **Late starter** stays off through 40% room brightness, then rises progressively.

### Show me how

**Show me how** is in the editor's **⋮** menu, in the sidebar editor and on dashboard cards. A short example on your own graph picks a shape, moves a point, sweeps Room brightness, then adds a point clearly above or below the line, so you see the shape bend to it, and removes it. The last two steps name the gesture for the input you use: mouse, touch or keyboard. Your shapes come back afterwards; nothing is saved and no light changes. The example starts only from **⋮** and never plays by itself.

### The ⋮ menu

For administrators the **⋮** menu holds **Show me how**, **Suggest shapes**, **Edit lights…**, **Delete group…** and, in the sidebar editor, **New group…**. Other users see only **Show me how**, and it is unavailable to them.

### Sidebar panel

In the sidebar panel the group name is the headline. Open its switcher to choose another group, or, as an administrator, start **New group…** from the **⋮** menu. You can edit the lights' shapes without adding a dashboard card first.

### Color, keyboard and touch

- Line patterns and marker shapes distinguish the lights without relying on color.
- Arrow keys move Room brightness, Ctrl+S saves and Ctrl+Z undoes.
- Touch targets are 44px, and a long press deletes a point.

### Who can change shapes

Lightener Studio works with one light or a whole room. Only administrators can change and save shapes; other users see them read-only.

## Preview on lights

**Preview on lights** lets your real lights follow your edits and **Room brightness**; every light in the group takes part. The switch sits at the end of the line under Room brightness, or in the header on wide sidebar panels. With it off, Room brightness only explores the graph. Lights ease smoothly where they support transitions, and lit lights in the list carry a warm halo.

### How the lights are put back

When the preview ends, through the switch, **Save**, **Cancel**, switching groups or leaving the editor, Lightener Studio attempts one command per changed light back to its brightness from before the preview, without asking.

- Putting lights back is best-effort: a service reply does not verify a physical light's brightness.
- A lost connection, changed user, lost permission or runtime barrier prevents further commands, including a put-back that is waiting on a command still in flight.
- Each command releases its lock after at most 10 seconds; a timeout does not cancel an issued command.
- If Home Assistant rejects a preview command, that light gets no further preview brightness until the preview ends; ending it still sends its one command back.
- An unauthorized rejection instead ends the preview and sends nothing back.
- Refresh, tab close or a closed browser can leave lights at their last preview brightness.

### Other editors, tabs and automations

Other editors in the same page do not preview the same lights at once. Other tabs, automations and physical controls are not tracked, so putting a light back can overwrite a change made elsewhere while the preview was on.

## Drafts and recovery

### Keep drafts during navigation

Unsaved shapes and Undo history can be retained in the currently open Home Assistant page. If navigation replaces the editor, choose **Recover draft** when returning, or **Discard draft** to remove that checkpoint. Sidebar and dashboard drafts stay separate; each signed-in user and group has its own choices. Recovery reads the current saved shapes first and uses **Review latest** if the saved baseline changed or a save outcome is uncertain. Recovery never saves shapes or starts **Preview on lights** automatically.

This recovery lives only in the open page. A full refresh, closing the tab or losing the browser process removes it; the leave-page warning remains best effort. Recovery is unavailable until your signed-in user and the saved group are ready. If a capacity warning says the latest edits were not retained, keep the editor open; an older checkpoint, if available, is labeled explicitly. Cancel, Discard and a confirmed Save remove only that editor's checkpoint. In the current page, a save with an unknown outcome still needs **Check saved state**, and a notice that saved shapes and lights may disagree still applies.

### Suggested shapes are not a draft

Leaving the editor while suggested shapes show keeps nothing to recover and raises no leave-page warning. They become a draft once you switch to Edit or switch **Preview on lights** on.

### If saved shapes changed elsewhere

If saved shapes changed elsewhere, the editor keeps your draft and Undo history and offers **Review latest**. Choose **Keep my shape** or **Use saved shape** for conflicting lights, and acknowledge any edited lights removed from the group. **Continue editing** adopts the reviewed saved baseline and selected local shapes; Undo then returns to those latest saved shapes. **Use saved shapes** discards the draft deliberately. Review never saves automatically: choose **Save** again when ready. If a save receipt is lost, **Check saved state** compares the complete saved content before allowing another deliberate save.

## Dashboard card

The sidebar editor needs no dashboard card. If you prefer editing from a dashboard, open the dashboard's card picker, choose **Lightener Studio** and pick your group. On Home Assistant 2026.6 and newer, picking a Lightener Studio group in the card picker also suggests Lightener Studio under **Community**. The card script loads automatically on every dashboard, in storage mode and YAML mode alike, with no resource setup.

In YAML, with the entity ID of the light that setup created in place of `light.your_group`:

```yaml
type: custom:lightener-curve-card
entity: light.your_group
```

On a dashboard card, administrators find **Suggest shapes** in the card's **⋮** menu.

If you previously added `/lightener/lightener-curve-card.js` as a Lovelace resource by hand, remove it under **Settings → Dashboards → Resources**. Lightener Studio loads the card itself, and the leftover resource double-loads the module.

### Motion options

Motion is on by default on dashboard cards and in the sidebar editor. Turn off individual moments for a dashboard card with a `joy` key:

```yaml
type: custom:lightener-curve-card
entity: light.your_group
joy:
  settle: false # disable the point's small overshoot after a drag
  diagonal: false # hide the diagonal guide, its landing feedback and snapping
  ripple: false # apply and preview shapes without motion
  draw_in: false # show added lights immediately and remove lights without fading
  watch: false # keep the light list still while Preview on lights is on; warm halos stay
  grip_hint: false # no effect for now; still accepted so existing cards load
```

What the moments do:

- **Draw-in** waits until the graph is visible, then 200ms more, and reveals the undimmed span; the portion past the Room brightness position stays dim. Lights that draw in are ready to edit at once, and a press or key press anywhere in the card ends a running draw-in. A removed light's line fades out after the same pause.
- **Diagonal:** a dragged point that comes within 9.2px of the diagonal, 0% or 100% lands on that line.
- **Preview:** while **Preview on lights** is on, each lit light in the list carries a warm halo that grows with its brightness. Turning it on wakes the lights one after another, and after each finished change only the lights whose brightness moved flicker once.
- **Reduced motion:** with reduced motion turned on in your operating system, settle, ripple, draw-in and the preview flicker stay off and no line flashes. The preview halos, the diagonal guide, its snapping and the short tap on phones that can vibrate stay.

## Updating

Updates show under **Settings → Updates**. Home Assistant runs an integration's Python at startup, so any release that changes backend behavior needs a Home Assistant restart; a repair reminds you and can restart for you. With HACS on Home Assistant 2026.10 or older, the first install needs a restart too. After the restart, reload any Home Assistant page that was open during the update: it still holds the old editor and dashboard card until then. A normal reload is enough.

Releases that change only the editor panel and the dashboard card are served from stable URLs, so they do not require a restart: install the update, then refresh the browser. Without a restart the card's address stays the same, so a cached copy can still show first. If the old editor still shows, try another full page reload; switching sidebar panels is not a reload. Cache state and duplicate resources can require further recovery, so there is no guaranteed refresh count. Follow the [version and cache checks](TROUBLESHOOTING.md#diagnostic-check-the-served-bundle-and-active-card) if it still looks old.

### Saving after an update

Saving is guarded: the editor and the backend must both be current. After updating the backend, refresh editors that were already open before saving. An editor from before the update receives `precondition_required` when it tries to save; there is no unguarded fallback and no automatic refresh, and its unsaved draft is not guaranteed to survive a refresh. A current editor also requires the updated backend before **Save** is available. Local viewing and editing remain available with an older backend.

## Removing Lightener Studio

To remove Lightener Studio, delete each group under **Settings → Devices & Services → Lightener Studio**, then open Lightener Studio in the Marketplace and choose **Uninstall** in its **⋮** menu (in HACS on Home Assistant 2026.10 or older, remove it there). Removing Lightener Studio removes the groups it created. Your lights and their devices stay as they are, and nothing else in your Home Assistant configuration is modified. Dashboard cards you added yourself show "custom element doesn't exist" after removal, like any uninstalled custom card, so delete them from the dashboard.

## Limits

Different lights can still have different physical brightness ranges. Shapes do not measure or calibrate a light's minimum brightness.

## Need help?

See [Troubleshooting](TROUBLESHOOTING.md) for [missing lights](TROUBLESHOOTING.md#no-lights-to-select), [a missed or expired editor link](TROUBLESHOOTING.md#the-editor-link-expired-or-opened-the-wrong-group), [a group still starting](TROUBLESHOOTING.md#the-new-group-is-still-starting) or [a failed save](TROUBLESHOOTING.md#saving-did-not-finish). Developers find the WebSocket commands in the [API reference](API.md).
