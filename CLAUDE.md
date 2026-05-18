# visualizer-helper — Project Context

## What this is

A utility library consumed exclusively by views built on the [npellet/visualizer](https://github.com/npellet/visualizer) framework. Views run inside iframes; this library bridges visualizer's AMD module system with CouchDB (via rest-on-couch) and provides domain helpers for ELN, NMR, chemistry, biology, and spectroscopy.

The library is **never published to npm** (`"private": true`). It is loaded at runtime by the visualizer's AMD loader (RequireJS-compatible). Source files live in `src/`, transpiled AMD output lands in `build/` via `npm run babel-test`.

## Module system — two coexisting styles

| Style                     | Used in                                                       | Import form                              |
| ------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| AMD (`define([...], fn)`) | `rest-on-couch/`, `util/`, `chemistry/`, `biology/`, `tiles/` | `define(['dep'], (dep) => { ... })`      |
| ESM (`import`/`export`)   | `eln/`, newer files                                           | `import Roc from '../rest-on-couch/Roc'` |

When adding code, match the style of the surrounding directory. The Babel plugin `@zakodium/babel-plugin-transform-modules-amd` converts both to AMD for the browser build.

## The `Roc` class (`rest-on-couch/Roc.js`)

Central interface to a rest-on-couch server. Every view that talks to CouchDB instantiates one:

```javascript
const roc = new Roc({ url, database, kind, messages });
// url: base URL of rest-on-couch server (e.g. 'https://couch.example.com')
// database: CouchDB database name (e.g. 'eln')
// kind: default $kind for new entries (optional)
```

Key methods:

| Method                            | Description                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `roc.getUser()`                   | Returns `{ username, name, groups, roles }` from the session                              |
| `roc.getUserPrefs(defaultPrefs?)` | Loads per-user JSON blob from `/db/{db}/user/_me`                                         |
| `roc.setUserPrefs(prefs)`         | Saves (merges on server) per-user JSON blob                                               |
| `roc.getUserInfo()`               | Extended user metadata                                                                    |
| `roc.view(viewName, options)`     | CouchDB view query; options: `key`, `startkey`, `endkey`, `limit`, `mine`, `include_docs` |
| `roc.create(entry)`               | Creates a CouchDB entry `{ $id, $content, $kind }`                                        |
| `roc.get(entry)`                  | Fetches full document                                                                     |
| `roc.getById(id)`                 | Fetches by `$id`                                                                          |
| `roc.update(entry)`               | Updates existing document                                                                 |
| `roc.delete(entry)`               | Deletes document                                                                          |
| `roc.document(uuid, opts)`        | Tracked/reactive document; `opts.varName`, `opts.track`                                   |

Authentication is cookie/session-based. All requests use `credentials: 'include'`.

## Saving and loading personal preferences in CouchDB

Three mechanisms exist, from simplest to most powerful:

### 1. Per-user global preferences — `getUserPrefs` / `setUserPrefs`

Simplest option. A single JSON blob per user per database, stored at `/db/{database}/user/_me`.

```javascript
// Load (with fallback defaults)
const prefs = await roc.getUserPrefs({ theme: 'light', pageSize: 25 });

// Save (keys are merged server-side, not replaced)
await roc.setUserPrefs({ theme: 'dark' });
```

Use when: preferences are global to the user across all views of a database.

### 2. Per-view, per-user preferences — `roc.UserViewPrefs`

Stored as a CouchDB entry with `$kind: 'userViewPrefs'`, keyed by `[username, ['userViewPrefs', prefID]]` in the `entryByOwnerAndId` view. `prefID` defaults to the current view's `_id` if omitted.

```javascript
// Available on any Roc instance
const prefs = await roc.UserViewPrefs.get(); // returns $content or undefined
await roc.UserViewPrefs.set({ zoom: 2, filter: 'NMR' });

// Explicit ID (useful when one view manages multiple pref namespaces)
const prefs = await roc.UserViewPrefs.get('myPrefKey');
await roc.UserViewPrefs.set(value, 'myPrefKey');
```

Use when: preferences are specific to a view and should not bleed across views.

### 3. Generic tracked preferences — `preferencesFactory` (`eln/preference.js`)

Creates a CouchDB entry with `$kind: 'viewPreferences'` and ID `${id}_${username}`. Supports reactive updates via `roc.document()` with `track: true`.

```javascript
import { preferencesFactory } from '../eln/preference';

const vp = await preferencesFactory('myView', {
  url,
  database: 'eln',
  initial: [{ key: 'columns', value: ['name', 'date'] }],
});

// The preference object is also cached in the visualizer API under `options.name`
await vp.save();
```

Use when: you need reactive two-way sync between the view's data model and CouchDB.

### 4. localStorage only — `track` (`util/track.js`)

Not CouchDB-backed. Persists in `localStorage` keyed by a cookie name. Supports versioning and default merging. Useful for ephemeral UI state that doesn't need to roam.

```javascript
// AMD
define(['Track'], (track) => {
  track(
    'massOptions',
    { version: 1, normalize: false },
    { varName: 'massOptions' },
  ).then((result) => {
    /* result is a reactive data object */
  });
});
```

## Directory guide

```
rest-on-couch/     Roc.js, UserViewPrefs.js, UserAnalysisResults.js
eln/               ELN-specific helpers (samples, NMR, preference.js, stock, …)
eln/util/          Shared ELN utilities (appendedDragAndDrop, getChartFromMass, …)
util/              Generic helpers: track.js, ModulePrefsManager.js, tips.js, privacy.js
chemistry/         Molecular formula, OCL, NMR renderers
biology/           DNA sequences, alignment helpers
spectra-data/      Spectroscopy data structures
tiles/             UI tile/grid management
on-tabs/           Multi-tab iframe bridge utilities
build/             Babel-transpiled AMD output (generated — do not edit)
```

## Build

```bash
npm run babel-test   # transpile src → build/ (AMD)
```

No test suite currently. Linting: `npm run eslint`. Formatting: `npm run prettier-write`.

## Visualizer integration

Views load modules via AMD paths configured in the visualizer. The library exposes helpers that interact with:

- `src/util/api` — visualizer's data/variable API (`API.createData`, `API.getData`, `API.cache`)
- `src/util/versioning` — change tracking (`Versioning.getData().onChange(...)`)
- `IframeBridge` — postMessage bridge between iframe and parent tab (`tab.status`, config passing)
