# Tool tab

A view of visualizer-on-tabs that frames one of the cheminfo sites —
3d.cheminfo.org today — and hands it the sample the tab was opened for, over
the cheminfo host protocol. One view serves every site: the tile that opens the
tab names the site, and `tools.js` says where the site is and what to read from
the sample for it.

## Create the view

Once, for every ELN that uses it.

1. **Pick the visualizer-helper commit** the view will load: one that contains
   `eln/toolTab`. A view loads visualizer-helper through its `vh` alias, pinned
   to a commit, so a later change — a new site in `tools.js` — reaches the view
   only when the alias moves to a newer commit.
2. **Create a view whose `view.json` is the one below**, with `<commit>`
   replaced, the way the other tab views are made (the 3D view `0e019bb4…` is
   one). It has no module: `startToolTab()` lays the site over the whole tab.
3. **Save and publish it** like the other tab views, and note its id: the tiles
   name it.

```json
{
  "version": "2.163.0",
  "grid": {
    "layers": { "Default layer": { "name": "Default layer" } },
    "xWidth": 10,
    "yHeight": 10
  },
  "modules": [],
  "variables": [{ "jpath": [""] }],
  "aliases": [
    {
      "path": "../../github/cheminfo-js/visualizer-helper/<commit>",
      "alias": "vh"
    }
  ],
  "configuration": { "title": "Cheminfo tool" },
  "actionscripts": [
    {
      "sections": {},
      "groups": { "action": [{ "name": [null], "script": [null] }] }
    }
  ],
  "init_script": [
    {
      "sections": {},
      "groups": {
        "general": [
          {
            "script": [
              "const { startToolTab } = await API.require('vh/eln/toolTab/startToolTab');\nstartToolTab({ hostName: 'SciPeaks' });"
            ]
          }
        ]
      }
    }
  ],
  "custom_filters": [
    {
      "sections": {
        "modules": [{ "sections": {}, "groups": { "modules": [[{}]] } }],
        "filtersLib": [{ "sections": {}, "groups": { "filters": [[{}]] } }],
        "filters": [
          {
            "sections": {},
            "groups": {
              "filter": [{ "name": [null], "script": [null] }],
              "libs": [[{}]]
            }
          }
        ]
      },
      "groups": {}
    }
  ],
  "actionfiles": [{ "sections": {}, "groups": { "action": [[{}]] } }]
}
```

The init script, written out:

```js
const { startToolTab } = await API.require('vh/eln/toolTab/startToolTab');
startToolTab({ hostName: 'SciPeaks' });
```

`hostName` is how the tab introduces itself to the site; it defaults to `ELN`.
To put the site in an element of your own instead of over the whole tab, pass
it as `container`.

## Open it from a tile

Two kinds of tile name a site by its address, written in `viewURL`. Both open
one tab per tile, named after it (`3D`), with the selected sample if there is
one; without one the site works on its own.

| Kind                 | Its tile                                                             |
| -------------------- | -------------------------------------------------------------------- |
| `optionalSampleTool` | Can always be clicked.                                               |
| `sampleTool`         | Is greyed until a sample is selected, if `isActive` says so (below). |

```json
{
  "id": "3D",
  "kind": "sampleTool",
  "description": "3D model",
  "viewURL": "https://3d.cheminfo.org/it/conformers?embed=1"
}
```

Any address of the site works — a language, a page, a link's own settings such
as `&maxConformers=20` — as long as it keeps `?embed=1`. The tab talks only to
that address's origin.

### What the home view needs, once

Two changes, and nothing else in the home view moves:

1. **The `Kind` column's select offers the two kinds**: add
   `;sampleTool;optionalSampleTool` to its editor options.
2. **`handleClick`, which opens the tab of a clicked tile, gets one more case**
   in its `switch`, beside the others:

```js
        case 'sampleTool':
        case 'optionalSampleTool':
            // viewURL holds a site's address: the tool tab view frames it and
            // hands it the selected sample, if there is one.
            IframeBridge.postMessage('tab.open', {
                id: tile.id,
                url: '<id of the view>',
                data: {
                    printer,
                    couchDB,
                    uuid: String(uuid || ''),
                    data: { url: String(tile.viewURL) }
                }
            });
            break;
```

`printer`, `couchDB` and `uuid` are the ones the `optionalSample` case already
uses. The tab is named after the tile alone, so there is one per tile: clicked
again with another sample selected, the same tab sends that sample to the site
without reloading it.

Both kinds then open with or without a sample. Keep `sampleTool` apart only to
grey its tile until a sample is selected — where the tiles' `isActive` tests
`tile.kind === 'sample'`, test `sampleTool` too; otherwise one kind is enough.

### Or name the site from the registry

A tile of kind `sample` or `optionalSample` can open this view directly, with
`viewURL` set to its id and the site named in `Data` as `{"tool":"3d"}`, a
name from `tools.js`. The tab reads `Data` as an object or as that JSON text,
and any field of the record can be replaced there.

## What the tab does

| When                                       | The tab                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| It opens with a sample                     | Frames the site, reads the sample, and sends its structure once the site says `hello`. |
| It opens with no sample (`optionalSample`) | Frames the site and sends nothing: the site works on its own.                          |
| The same tab is handed another sample      | Sends that sample through the same connection, without reloading the site.             |
| It is handed the same sample again         | Changes nothing, so what the user did in the site stays.                               |
| The site reloads (a link inside it)        | Connects again and sends the sample again.                                             |
| The site cannot use the sample             | Shows the site's own sentence as a notification, e.g. a sample with no structure.      |

The site gets the structure in every form the sample keeps — the molfile,
the OpenChemLib idcode and the formula — and takes the one it prefers.

## Add a site

1. **The site must speak the host protocol.** 3d.cheminfo.org does: its README
   has the messages under _Framed by a notebook_.
2. **Add its record to `TOOLS` in `tools.js`**: a `title`, an https `url` with
   `?embed=1`, and the readers it needs (`read`, `['structure']` today).
3. **Run `npm test`, merge, and move the view's `vh` alias** to that commit.

A site that does not speak the protocol yet can still be framed by naming it
in the tile, `"data": { "url": "https://lcao.cheminfo.org/?embed=1" }`: it opens
as a plain frame, with no sample.

## When it does not work

| What you see                                                                | Why                                                                                                       |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A notification: _No tool is named "x" in this version of visualizer-helper_ | The view's `vh` commit predates that tool: move the alias.                                                |
| The site, without the sample                                                | The sample has no molfile, idcode or formula (the site says so), or the site does not speak the protocol. |
| _The sample could not be read…_                                             | The user may not read that sample, or rest-on-couch did not answer.                                       |
| An empty frame, `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` in the console | A public ELN framing a site on `localhost`: Chrome refuses it. Frame the deployed site.                   |
| _IframeBridge is not loaded_ in the console                                 | The view was opened outside visualizer-on-tabs, e.g. to edit it. Expected.                                |

## Not built yet

Saving a result back into the sample, and reading its spectra and
chromatograms for a site that takes them.
