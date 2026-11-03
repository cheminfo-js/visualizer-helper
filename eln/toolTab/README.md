# Tool tab

A view of visualizer-on-tabs that frames one of the cheminfo sites —
3d.cheminfo.org, lcao.cheminfo.org, osiris.cheminfo.org and draw.cheminfo.org
today — and hands it the entry the tab was opened for, a sample or a reaction,
over the cheminfo host protocol. One view serves every site: the tile or the
button that opens the tab names the site, and `tools.js` says where the site
is, what to read from the entry for it, and where to save what it gives back.

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
              "const { startToolTab } = await API.require('vh/eln/toolTab/startToolTab');\nstartToolTab();"
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
startToolTab();
```

The tab introduces itself to the site as `SciPeaks`; another ELN passes its own
name, `startToolTab({ hostName: 'ELN' })`.
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

### Or open draw from a reaction

draw edits a reaction, so it is opened for one rather than for the selected
sample: a button on the reaction page opens the tab with the reaction's uuid.

```js
const reaction = API.getData('reaction');
IframeBridge.postMessage('tab.open', {
  id: `Scheme ${reaction.$id}`,
  url: '<id of the view>',
  data: {
    couchDB: { url: API.cache('couchUrl'), database: API.cache('database') },
    uuid: String(reaction._id),
    data: { tool: 'draw' },
  },
});
```

The tab refuses an entry that is not a reaction, so a draw tile handed a sample
opens nothing rather than writing a reaction into it.

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
| It opens draw with a reaction              | Sends its RXN file and its `overview.svg`, the drawing draw saved last time.           |
| The reaction is changed in draw            | Saves the RXN file and the drawing together, into the reaction.                        |

The site gets the structure in every form the sample keeps — the molfile,
the OpenChemLib idcode and the formula — and takes the one it prefers.

### What draw saves

| What draw gives back | Where it goes                                                      |
| -------------------- | ------------------------------------------------------------------ |
| `reaction`           | `$content.reactionRXN`, the RXN file the reaction page reads       |
| `drawing`            | the `overview.svg` attachment, the picture the reaction page shows |

draw says when the reaction changes; the tab then asks it for both and writes
them from that one moment, so the picture never shows another reaction than the
RXN file. It reads the latest revision first and writes a file only when its
text changed, and opening a reaction saves nothing. The drawing is draw's own
SVG: opened again, it brings back the conditions, curly arrows and style. An
`overview.svg` draw did not write is ignored, and draw opens the RXN file.

## Add a site

1. **The site must speak the host protocol.** 3d, lcao and osiris do, through
   `react-cheminfo/host`; their READMEs have the messages under _Framed by a
   notebook_.
2. **Add its record to `TOOLS` in `tools.js`**: a `title`, an https `url` with
   `?embed=1`, the kind of `entry` it opens (`sample`, the default, or
   `reaction`), the readers it needs (`read`: `structure`, `reaction`,
   `drawing`), and in `save` where each output it gives back is kept — a field
   of `$content` (`{ writer: 'content', jpath }`) or a file
   (`{ writer: 'attachment', filename }`).
3. **Run `npm test`, merge, and move the view's `vh` alias** to that commit.

A site that does not speak the protocol yet can still be framed by naming it
in the tile, `"data": { "url": "https://surge.cheminfo.org/?embed=1" }`: it opens
as a plain frame, with no sample.

## When it does not work

| What you see                                                                | Why                                                                                                       |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A notification: _No tool is named "x" in this version of visualizer-helper_ | The view's `vh` commit predates that tool: move the alias.                                                |
| The site, without the sample                                                | The sample has no molfile, idcode or formula (the site says so), or the site does not speak the protocol. |
| _The sample could not be read…_                                             | The user may not read that sample, or rest-on-couch did not answer.                                       |
| _The reaction could not be read…: it is a sample, not a reaction_           | A draw tab was opened from a sample tile: open it from the reaction (above).                              |
| _What Reaction scheme gave back could not be saved…_                        | The user may not write that reaction, or rest-on-couch did not answer. draw keeps the drawing.            |
| The reaction page, saving after draw did, reports a conflict                | It still holds the revision it loaded: reload it before saving there again.                               |
| An empty frame, `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` in the console | A public ELN framing a site on `localhost`: Chrome refuses it. Frame the deployed site.                   |
| _IframeBridge is not loaded_ in the console                                 | The view was opened outside visualizer-on-tabs, e.g. to edit it. Expected.                                |

## Not built yet

Reading a sample's spectra and chromatograms for a site that takes them.
