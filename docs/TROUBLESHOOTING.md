# Troubleshooting: card ships new code but UI looks like an old version

If a user reports **any** of these after an integration upgrade, treat them as
one compound symptom — not three independent bugs:

- Card editor renders the "Entity" label but the `<ha-entity-picker>` is blank.
- In-card light-management UI (Add light / per-row Remove) is missing even
  though the shipped version advertises it.
- Scrubber or legend shows behaviour from an older version (e.g., per-light
  value badges appear even though the current release removed them from the
  scrubber, or the live-preview button ("Watch room react") appears in the card
  header instead of the scrubber panel).

These share one root cause: **the class currently registered under
`<lightener-curve-card>` in the user's browser is not the class from the
current bundle.**

## Why it happens (in order of what to check)

1. **HACS "installed version" label vs bytes on disk.** HACS sometimes
   reports `vX.Y.Z` installed while the files under
   `/config/custom_components/lightener_studio/` are from an older release. This
   has been reproduced. Fix: HACS → three-dot menu on the Lightener repo →
   **Redownload** → pick the target version → restart Home Assistant.
2. **Browser Workbox / HTTP cache held the previous bundle.** HA's service
   worker (`home-assistant-frontend`, scope `/`) and the browser's HTTP
   disk cache can both keep the pre-upgrade card JS. The first page load
   after upgrade wins the race and registers the **old** class via
   `customElements.define('lightener-curve-card', …)`. Because `define` is
   one-shot, every subsequent fetch of the fresh bundle has its
   `customElements.define` call silently fail (`NotSupportedError`). Every
   instance on the page continues to use the stale class — missing methods
   and missing render branches from the new version.
3. **Stray shadow copy on disk.** A manual file in `/config/www/…` or
   `/config/www/community/…` referenced by a Lovelace resource can shadow
   the integration's registered static path
   (`/lightener/lightener-curve-card.js` → `custom_components/lightener_studio/frontend/lightener-curve-card.js`).

## Diagnostic: prove the active class is stale

Run in DevTools on the HA page:

```js
(async () => {
  const ctor = customElements.get('lightener-curve-card');
  const proto = ctor?.prototype;
  const hasCanManageLights = proto && !!Object.getOwnPropertyDescriptor(proto, '_canManageLights');
  const r = await fetch('/lightener/lightener-curve-card.js', { cache: 'no-store' });
  const t = await r.text();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))]
    .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
  return JSON.stringify({
    className: ctor?.name,            // minified, e.g. "He" vs "Be" — just needs to be stable per-version
    hasCanManageLights,               // must be true on any build that ships PR #52
    bytes: t.length,
    cardVersion: window.__LIGHTENER_CURVE_CARD_VERSION__,   // e.g. "2.15.0"
    sha256Prefix: hash,
    lastModified: r.headers.get('last-modified')
  });
})();
```

**Healthy state on current `master`:**
`hasCanManageLights === true`, `cardVersion` matches the installed release.

Compare `bytes` to the server file:
```bash
# locally:
wc -c < custom_components/lightener_studio/frontend/lightener-curve-card.js
# over SSH:
ssh "$HA_SSH_TARGET" "wc -c < /config/custom_components/lightener_studio/frontend/lightener-curve-card.js"
```
If the two sizes agree but the browser still has a stale class, you're in
case 2 (browser cache). If they disagree, you're in case 1 or 3.

## Recovery sequence

Run these in order. Stop as soon as the diagnostic above is healthy.

1. **Fix the file on disk first.** HACS Redownload + restart HA (case 1),
   or `scripts/ha-sync --frontend-only` for a dev loop, or delete the
   shadow file in `/config/www/…` (case 3).
2. **Clear the browser.** In DevTools Console on the HA origin:
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
   on this browser profile (bfcache / shared module graph across tabs can
   resurrect the old class) and reopen one tab. Re-run the diagnostic.

## Automatic mitigation (shipped in v2.15.0+)

As of **v2.15.0**, the card module is served at a **path-stamped URL** —
`/lightener/lightener-curve-card.<version>.js` — instead of the old
`?v=<version>` query-string form. This forces a genuine cache miss in the HA
Workbox service worker on every upgrade, because the URL path itself changes
(Workbox ignores query parameters when matching cached entries).

The unversioned `/lightener/lightener-curve-card.js` path is still served for
back-compat with users who manually added that URL as a Lovelace resource.

Because the path-stamped URL is immutable per release, that route is served
with cache headers (`cache_headers=True`) so the bundle downloads once per
upgrade instead of on every page load; the unversioned route stays uncached.

Additionally, if the loaded card class reports a version mismatch via
`window.__LIGHTENER_CURVE_CARD_VERSION__`, the panel triggers a one-time
`location.reload()` (gated by `sessionStorage` to prevent reload loops) so
the new bundle takes over without manual intervention.

**Known gap (tracked as P2):** The panel JS itself (`lightener-panel.js`) is
still served via a `?v=<version>` query-string URL. Workbox ignores query
parameters when matching cached entries, so a Workbox-cached stale panel can
still load after an upgrade. If the stale panel requests an old path-stamped
card URL that the new server has not registered, the panel falls back to the
unversioned card path. This edge case will be addressed in a follow-on release
that path-stamps the panel URL as well.

If you still see stale behaviour after an upgrade, run the recovery sequence
above — the automatic mitigation covers the common case but cannot clear a
fully-cached service worker or a shadow file on disk.

## Card picker suggestion not appearing (HA 2026.6+)

The integration registers the card on `window.customCards` and loads the card
script on every dashboard via `frontend.add_extra_js_url`. If picking a
Lightener light in the card picker does not suggest Lightener Studio:

1. **Check HA version** — the entity suggestion API shipped in HA 2026.6.
   Older versions still show the card in the picker's custom-card list, but
   never as an entity suggestion.
2. **Check the entity** — only registry-backed `lightener` platform lights are
   suggested, by design. Lights configured via legacy YAML have no entity
   registry entry and get no suggestion (the manual card YAML still works).
   Ordinary lights are never suggested.
3. **Check for a leftover manual resource** — a previously hand-added
   `/lightener/lightener-curve-card.js` Lovelace resource double-loads the
   module. This is harmless thanks to the guarded element registration, but
   remove it (Settings → Dashboards → Resources) to keep one loader.
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
2. In HACS → three-dot menu → **Custom repositories**, remove the
   Lightener Studio entry (the trash icon), then re-add
   `florianhorner/lightener-studio` as type **Integration**. Removing it
   from HACS does **not** touch your entities, config entries, or
   dashboards — those live in Home Assistant core. Do **not** remove the
   integration from Settings → Devices & Services; that *would* delete
   your configured groups and curves.
3. Redownload Lightener Studio in HACS and restart Home Assistant.
4. Verify: exactly one folder (`custom_components/lightener_studio/`)
   exists, and the Repair issue is gone after the restart.

The cached domain has been observed to survive a remove/re-add and revert
after restarts. If the stray folder comes back on the next update, repeat
step 1 — it is a two-minute cleanup and your entities are never at risk —
and please report it on the
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
Paste the relevant lines when filing a bug.

## Still stuck, or have feedback?

[Open an issue](https://github.com/florianhorner/lightener-studio/issues/new/choose) —
bug reports and feature ideas both help. For a stale-card problem, paste the
diagnostic output from above so the cause is clear from the first reply.
