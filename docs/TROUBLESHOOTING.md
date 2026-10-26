# Troubleshooting

Start with the [installation and first-curve guide](../README.md#installing). The steps below preserve existing groups and curves.

## Lightener Studio is missing from HACS search

Search for **Lightener Studio**, type **Integration**, from
`florianhorner/lightener-studio`. The original **Lightener** from
`fredck/lightener` is a separate integration and is not a prerequisite.

Lightener Studio's [default-list submission](https://github.com/hacs/default/pull/8892)
merged on 18 October 2026. Inclusion in that list does not establish when a
particular HACS client receives it. HACS [refreshes its catalog at startup and
periodically](https://www.hacs.xyz/docs/faq/data_sources/); allow for that refresh
and check any search filters before concluding that the listing is missing.

If it is still unavailable, use the [custom-repository fallback](../README.md#find-and-download-lightener-studio).
Download Lightener Studio, restart Home Assistant, then [create your first group](../README.md#create-your-first-group).
An empty group picker after download is not a substitute for adding the
integration through **Settings → Devices & services**.

HACS may show older installation instructions even when the repository's
current README has been corrected. With `render_readme` enabled, HACS normally
reads documentation from the installed version, or the latest stable version
before installation; an explicit documentation version overrides that choice.
See [HACS's version-selection code](https://github.com/hacs/integration/blob/c0dfd8b44297c3673c21973e2539375a53687a9c/custom_components/hacs/repositories/base.py#L1322-L1361).
The README in v2.17.3 therefore still describes custom-repository setup. Use the
[current installation guide](https://github.com/florianhorner/lightener-studio#installing)
until a release includes the correction. Existing tags are not rewritten.

## Lightener Studio is missing from Add Integration

Downloading in HACS and creating a group are separate steps. Finish the HACS download, restart Home Assistant, and refresh the browser. Then open **Settings → Devices & Services → Add Integration** and search for **Lightener Studio**. If it is still absent, check **Settings → System → Logs** for a Lightener Studio setup error.

## The integration logo is missing

Home Assistant 2026.3 and newer can display the logo bundled with Lightener
Studio. Older versions fetch integration images from Home Assistant's public
brand service, which may show an “icon not available” placeholder. This does not
affect your groups or brightness shapes.

The [Home Assistant branding announcement](https://contributors.home-assistant.io/blog/2026/02/24/brands-proxy-api/)
describes this version boundary. Reinstalling Lightener Studio or clearing the
browser cache does not add bundled-logo support to an older Home Assistant.

## No lights to select

Make sure the lights already exist and work in Home Assistant. If you used **Narrow by area**, restart the unfinished setup flow with that optional filter empty; a light may have no area or belong to another area. Enable a disabled light under **Settings → Devices & Services → Entities**, then reopen the selector. Existing Lightener Studio groups cannot be members of another Lightener Studio group.

Choose at least one light and finish setup. Open the group's editor with **Configure** beside it on the Lightener Studio integration page, then [save a first curve](../README.md#save-your-first-curve). Two dimmable lights make the comparison easier, but a single light works.

## Setup finished, but the editor did not open

**Finish** and **Skip and finish** complete Home Assistant's setup. Depending on where you started, Home Assistant may show the new device page or return to the integrations dashboard.

Open **Settings > Devices & Services > Lightener Studio** and choose **Configure** beside your group. It opens that group's editor, even when Lightener Studio is hidden from the sidebar. You can also open the sidebar panel and select the group by name.

The device-page **Visit** action is an unreleased addition; it is absent from v2.17.3 and v2.18.0-beta.1. Use **Configure** or the sidebar with those releases. The [first-curve guide](../README.md#save-your-first-curve) notes the other unreleased onboarding changes.

## The editor link expired or opened the wrong group

Setup links from older versions are temporary. Open **Settings > Devices & Services > Lightener Studio** and choose **Configure** beside the group you named during setup. Or open **Lightener Studio** from the sidebar and select the group by name. Check its member lights before editing, then continue with [your first curve](../README.md#save-your-first-curve). If you have several groups, do not assume the currently selected group is the one you just created.

Group creation and editing require an administrator. A non-admin can view curves; ask an administrator to complete setup or save changes.

## The new group is still starting

Wait for Home Assistant to finish setting up the group. If the panel offers **Retry**, use it; if the setup-link notice asks you to refresh, reload the page. Once the group is ready, select it by name and continue editing. If it remains missing, check **Settings → Devices & Services → Lightener Studio** and **Settings → System → Logs** for setup errors. Keep the existing group while resolving the error rather than creating duplicates.

## Saving did not finish

A save error or timeout is not a confirmed save. Keep the editor open and restore the Home Assistant connection. If offered **Check saved state** or a saved-shape review, complete it before saving again. Wait for confirmation before reloading, then verify the group still has your chosen shape. Older versions use **Save this room** during Watch. If the error persists, record the message and check **Settings → System → Logs**.

Saving keeps shapes. Restoration of temporary **Watch room react** brightness is a separate outcome; check any unresolved restoration notice. Restoration requires the editor to remain mounted and connected, and a service receipt does not prove that the physical lights restored. To use the saved shape afterward, change the group’s normal Home Assistant brightness control.

<a id="troubleshooting-card-ships-new-code-but-ui-looks-like-an-old-version"></a>

## Card ships new code but UI looks like an old version

If a user reports **any** of these after an integration upgrade, treat them as
one compound symptom — not three independent bugs:

- Card editor renders the "Entity" label but the `<ha-entity-picker>` is blank.
- In-card light-management UI (Add light / per-row Remove) is missing even
  though the shipped version advertises it.
- Scrubber or legend shows behaviour from an older version (e.g., per-light
  value badges appear even though the current release removed them from the
  scrubber, or the live-preview button ("Watch room react") appears in the card
  header or the panel's top toolbar instead of the action row under Room
  brightness).

These can indicate that **the class currently registered under
`<lightener-curve-card>` in the browser is older than the intended release**.
Check the installed files and the browser separately before diagnosing a
product defect.

## Why it happens (in order of what to check)

1. **HACS "installed version" label vs bytes on disk.** HACS sometimes
   reports `vX.Y.Z` installed while the files under
   `/config/custom_components/lightener_studio/` are from an older release. This
   has been reproduced. Fix: HACS → three-dot menu on the Lightener Studio repo →
   **Redownload** → pick the target version → restart Home Assistant.
2. **Browser Workbox / HTTP cache held the previous bundle.** HA's service
   worker (`home-assistant-frontend`, scope `/`) and the browser's HTTP
   disk cache can both keep the pre-upgrade card JS. The first page load
   after upgrade wins the race and registers the **old** class via
   `customElements.define('lightener-curve-card', …)`. Because `define` is
   one-shot, Lightener Studio's guarded registration keeps the first class even if
   another bundle later evaluates. Fetching fresh bytes does not replace that
   registered class. Existing card instances can therefore retain older methods
   and render branches.
3. **Stray shadow copy on disk.** A manual file in `/config/www/…` or
   `/config/www/community/…` referenced by a Lovelace resource can shadow
   the integration's registered static path
   (`/lightener/lightener-curve-card.js` → `custom_components/lightener_studio/frontend/lightener-curve-card.js`).

## Diagnostic: check the served bundle and active card

Run in DevTools on the HA page:

```js
(async () => {
  const ctor = customElements.get('lightener-curve-card');
  const proto = ctor?.prototype;
  const result = {
    className: ctor?.name ?? null, // a clue, not a unique version identifier
    hasCanManageLights: !!proto && !!Object.getOwnPropertyDescriptor(proto, '_canManageLights'),
    bytes: null,
    cardVersion: window.__LIGHTENER_CURVE_CARD_VERSION__ ?? null, // last evaluated bundle's marker
    sha256: 'unavailable (bundle not fetched)', // fetched bytes, not proof of the registered class
    lastModified: null
  };
  let failure = 'card fetch failed';
  try {
    const r = await fetch('/lightener/lightener-curve-card.js', { cache: 'no-store' });
    if (!r.ok) {
      result.sha256 = `unavailable (card fetch failed: HTTP ${r.status})`;
      return JSON.stringify(result);
    }
    result.lastModified = r.headers.get('last-modified');
    failure = 'card response body read failed';
    const bytes = await r.arrayBuffer();
    result.bytes = bytes.byteLength;
    if (globalThis.crypto?.subtle) {
      failure = 'SHA-256 digest failed';
      result.sha256 = [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))]
        .map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      result.sha256 = 'unavailable (secure context required)';
    }
  } catch {
    result.sha256 = `unavailable (${failure})`;
  }
  return JSON.stringify(result);
})();
```

For v2.17.3 and newer, expect `hasCanManageLights === true` and a `cardVersion`
matching the intended release. These are useful checks, not sufficient proof:
a second bundle can update the version marker while the first registered class
remains active. Minified class names are not unique version identifiers either.

On non-loopback HTTP pages, Web Crypto hashing may be unavailable. The
diagnostic then reports `sha256: "unavailable (secure context required)"` while
retaining the other fields. Fetch, body-read, and digest failures also report
an explicit unavailable reason and preserve any observations already collected.
A missing class or version marker is reported as `null`.

When SHA-256 is available, compare it with the bundle from the intended release
and the file on the Home Assistant server. When it is unavailable, the browser
hash comparison remains unconfirmed. For example, where `sha256sum` is available:
```bash
sha256sum /config/custom_components/lightener_studio/frontend/lightener-curve-card.js
```
On macOS, use `shasum -a 256 <file>`. Equal byte counts alone do not establish
equal contents. A matching fetch hash establishes the served bytes, not which
bytes registered the active card.

For stronger evidence, check for duplicate manual resources, then open a fresh
page with browser DevTools Network recording. Inspect the card script loaded by
that page, compare its bytes with the intended release, and check the marker
and the expected editor behavior together. Keep disk version, served bundle
and active-card observations separate; if competing copies remain, the active
version is still unconfirmed.

## Recovery sequence

Run these in order. Stop when the served bundle and active editor agree with
the intended release.

1. **Fix the file on disk first.** HACS Redownload + restart HA (case 1),
   or `scripts/ha-sync --frontend-only` for a dev loop. For case 3, remove the
   duplicate manual Lovelace resource and only delete a shadow file after
   confirming it belongs to this card and is no longer referenced.
2. **Reload the full page**, then try once more if the old editor remains.
   There is no guaranteed refresh count. If the version still does not agree,
   the following clears service workers and cached assets for the HA origin in
   this browser profile; it does not change server configuration. In DevTools:
   ```js
   (async () => {
     for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
     for (const k of await caches.keys()) await caches.delete(k);
     await fetch('/lightener/lightener-curve-card.js', { cache: 'reload' });
     location.reload();
   })();
   ```
   The explicit `fetch({ cache: 'reload' })` is required: `location.reload()`
   alone will often serve the stale copy from the browser's HTTP disk
   cache if the response lacked a strong `Cache-Control` header.
3. **If the registered class is still the old one,** close every HA tab
   on this browser profile and reopen one tab to start a fresh document.
   Re-run the diagnostic and check the editor behavior.

## Automatic mitigation

The card module is served from a single **stable, unversioned URL** —
`/lightener/lightener-curve-card.js` — with no-cache headers. This is what lets
a frontend-only release land without a Home Assistant restart: the route is
registered once and always serves the current on-disk bundle, so a browser
refresh picks up a new release even though Home Assistant has not restarted. A
path-stamped `/lightener/lightener-curve-card.<version>.js` route would only be
registered when `async_setup` re-runs (an HA restart) — exactly what we want to
avoid for routine UI updates.

HA's Workbox service worker can serve cached scripts while revalidating them
in the background. A subsequent refresh can then receive the newer bundle.
That is why trying another full reload can help after a frontend update; the
result still depends on the browser's cache and resource state.

The `customElements.define('lightener-curve-card', …)` call is one-shot per
document, so a stale bundle that loads first would otherwise pin the old class.
The panel backstops this: if the loaded card reports a version mismatch via
`window.__LIGHTENER_CURVE_CARD_VERSION__`, it triggers a one-time
`location.reload()` (gated by `sessionStorage` to prevent reload loops) so the
browser gets another chance to load the revalidated bundle. This does not
guarantee recovery when duplicate resources or stale caches remain.

**Known limitation:** the sidebar panel (`lightener-panel.js`) is still served
with a `?v=<version>` query URL computed at `async_setup`, so its query value is
frozen until an HA restart. The panel content can still refresh without a restart
because the server ignores the query when serving the stable panel route.
The query value alone is therefore not proof of the panel bytes loaded by the
browser. Further loader improvements are tracked separately in `TODOS.md`.

If you still see stale behaviour after an upgrade, run the recovery sequence
above — the automatic mitigation covers the common case but cannot clear a
fully-cached service worker or a shadow file on disk.

## Card picker suggestion not appearing (HA 2026.6+)

The integration registers the card on `window.customCards` and loads the card
script on every dashboard via `frontend.add_extra_js_url`. If picking a
Lightener Studio group in the card picker does not suggest Lightener Studio:

1. **Check HA version** — the entity suggestion API shipped in HA 2026.6.
   Older versions still show the card in the picker's custom-card list, but
   never as an entity suggestion.
2. **Check the entity** — only registry-backed `lightener` platform lights are
   suggested, by design. Lights configured via legacy YAML have no entity
   registry entry and get no suggestion (the manual card YAML still works).
   Ordinary lights are never suggested.
3. **Check for a leftover manual resource** — a previously hand-added
   `/lightener/lightener-curve-card.js` Lovelace resource double-loads the
   module. Guarded registration prevents redefining the element but keeps
   whichever class registered first. Remove the duplicate resource
   (Settings → Dashboards → Resources) to keep one loader.
4. **Check the Home Assistant log** (Settings → System → Logs) for
   `Could not register Lightener card as a frontend extra module` — this
   warning means the frontend extra-module API was unavailable or raised at
   boot (for example frontend had not finished setting up), so the automatic
   loader was skipped. If the card's static assets themselves failed to
   register, that is logged at debug level only and the extra-module step is
   skipped silently — enable debug logging for `custom_components.lightener_studio`
   to see it.
5. **Reload the page** — `window.customCards` is populated at page load. A
   picker opened in a tab from before the upgrade won't see the new entry
   until the tab reloads.

## Lights or config disappeared after the domain rename (`lightener` → `lightener_studio`)

This section is for older Lightener Studio installations migrating domains. A fresh
installation from the current HACS listing does not need this migration. Do
not remove a working installation of the separate upstream Lightener project.

The integration domain changed from `lightener` to `lightener_studio` (so it can
ship in the HACS default store). Home Assistant keys config entries and entities
by domain and loads its registries before any integration code runs, so this
cannot migrate automatically — but it is one command.

**The easy path (one command).** With Home Assistant **stopped**:

```bash
scripts/migrate-to-lightener-studio            # read-only plan (changes nothing)
scripts/migrate-to-lightener-studio --apply    # remove old dir + deploy + migrate
```

It reads `HA_SSH_TARGET` / `HA_CONFIG_DIR` from `.context/ha-sync.env`, removes the
colliding old `custom_components/lightener/` directory, deploys `lightener_studio`,
and migrates `.storage` — taking a timestamped backup first. Then **start Home
Assistant** and confirm your entities and curves are intact. (Add `--restart` to
let it stop/start HA for you; it asks for confirmation first.)

**Under the hood / manual path.** The storage migrator can be run on its own. It
rewrites only the domain/platform/identifier fields, so every `entity_id`,
`unique_id`, config-entry id, and stored curve is preserved; it is dry-run by
default, idempotent, and warns if the old directory is still present:

```bash
python scripts/migrate_domain.py --storage <config>/.storage          # preview
python scripts/migrate_domain.py --storage <config>/.storage --apply  # apply
```

Either way, your dashboard cards (`custom:lightener-curve-card`) and the
`/lightener-editor` route are unchanged.

If the old `custom_components/lightener/` directory *reappears* after a
later HACS update, that is not this migration regressing — see the next
section for why HACS re-creates it and how to stop it.

## HACS installs updates into the old custom_components/lightener folder

**Symptom:** updating through HACS fails with
`No manifest.json file found 'custom_components/lightener/manifest.json'`,
or after a HACS update you find **two** folders on disk —
`custom_components/lightener/` and `custom_components/lightener_studio/`.
Meanwhile Settings → Devices & Services shows the integration working
normally under `lightener_studio`.

**Root cause: HACS's own bookkeeping, not this repository's code.** HACS
caches the integration domain it first derived for a repository in its own
storage (`.storage/hacs.repositories`) and uses that cached value — not the
manifest inside the release it just downloaded — to decide which
`custom_components/<domain>/` folder to extract a `zip_release` into. That
cached value is set when the repository is added and is not reliably
re-derived afterward, so installs added before the `lightener` →
`lightener_studio` domain rename keep extracting into the old folder name.
This is a known HACS behavior
([hacs/integration#931](https://github.com/hacs/integration/issues/931));
HACS's "Update information" and "Redownload" actions refresh release
metadata but do not fix the cached domain.

The danger case is when the stray `lightener/` folder contains a *current*
release: its manifest declares `domain: lightener_studio`, the same as the
real folder, and Home Assistant's loader picks between the two duplicates
unpredictably — a restart can silently downgrade you. The integration
detects both cases at startup and raises a Repair issue
(Settings → System → Repairs): critical for the duplicate-domain collision,
a warning for a dormant pre-rename leftover.

The check is deliberately conservative: it only flags a folder it can
attribute to this project (via the manifest's documentation/issue-tracker/
codeowners fields), so an unrelated integration legitimately installed at
`custom_components/lightener/` — such as upstream
[Lightener](https://github.com/fredck/lightener) running side by side — is
never flagged. The collision issue is raised only when *both* folders
exist; if the misplaced `lightener/` folder is the only installed copy, no
issue is raised, because deleting it would remove the integration.

**Fix sequence:**

1. Delete the stray `custom_components/lightener/` folder. If it holds the
   *newer* build (check the `version` in each folder's `manifest.json`),
   copy its contents over `custom_components/lightener_studio/` first.
2. For an installation originally registered as a custom repository, open
   HACS → three-dot menu → **Custom repositories**. If the Lightener Studio entry is
   still present, remove that custom registration, then find
   `florianhorner/lightener-studio` through HACS search (or the custom-repository
   fallback if the default listing is unavailable). Do **not** remove the
   integration from Settings → Devices & Services; that would delete your
   configured groups and curves. Default-list installations may have no custom
   registration to remove; the discovery change does not prove that an older
   cached domain has been repaired.
3. Redownload Lightener Studio in HACS and restart Home Assistant.
4. Verify: exactly one folder (`custom_components/lightener_studio/`)
   exists, and the Repair issue is gone after the restart.

The cached domain has been observed to survive a remove/re-add and revert
after restarts. Before changing files, back up the configuration and confirm
which copy is installed. If the stray folder comes back on the next update,
recheck the versions before repeating step 1, and report it on the
[issue tracker](https://github.com/florianhorner/lightener-studio/issues)
so we can track how often HACS re-creates it.

## Enable debug logging

To capture detailed backend logs (config flow, WebSocket commands, preview),
add this to `configuration.yaml`, restart Home Assistant, and reproduce the issue:

```yaml
logger:
  logs:
    custom_components.lightener_studio: debug
```

The logs appear in **Settings → System → Logs** (and in `home-assistant.log`).
Before pasting relevant lines in a bug report, redact personal and sensitive
details using the [privacy rules](OPEN-ROOM-LAB.md#privacy-rules).

## Still stuck, or have feedback?

[Open an issue](https://github.com/florianhorner/lightener-studio/issues/new/choose) —
bug reports and feature ideas both help. For a stale-card problem, paste the
diagnostic output from above so the cause is clear from the first reply.
