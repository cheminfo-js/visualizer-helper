/**
 * A tool tab: a view of visualizer-on-tabs that frames one of the cheminfo
 * sites and hands it the entry the tab was opened for — a sample, a reaction —
 * over the cheminfo host protocol, saving back what the site returns when its
 * record says where.
 *
 * The view needs no module, only two lines of init script — see `README.md`:
 *
 *   const { startToolTab } = await API.require('vh/eln/toolTab/startToolTab');
 *   startToolTab();
 *
 * A tile opens it with the site named in its `data` (see `./tools.js`):
 *
 *   { "id": "3D", "kind": "sample", "viewURL": "<this view>", "data": { "tool": "3d" } }
 */

import UI from 'src/util/ui';

import Roc from '../../rest-on-couch/Roc';
import Sample from '../Sample';
import elnPlugin from '../libs/elnPlugin';

import { createEntrySaver } from './entrySave';
import { DEFAULT_HOST_NAME, connectSite } from './hostConnection';
import { entryLoad, filesToRead } from './readers';
import { toolRecord } from './tools';

/**
 * Make the view a tool tab.
 *
 * A tab opened with no entry — a tile of kind `optionalSample` with nothing
 * selected — frames the site alone. The same tab handed another entry sends
 * that one through the same port, without reloading the site; the same entry
 * again changes nothing. A record with a `save` writes into the entry what the
 * site hands back, each time the site says it changed.
 *
 * @param {object} [options] - Where the site goes, and how the tab presents
 * itself.
 * @param {HTMLElement} [options.container] - The element the site fills.
 * Defaults to one laid over the whole tab, so the view needs no module.
 * @param {string} [options.hostName] - How the tab calls itself to the site.
 * Defaults to `'SciPeaks'`.
 */
export function startToolTab(options = {}) {
  const { container, hostName = DEFAULT_HOST_NAME } = options;
  if (typeof IframeBridge === 'undefined') {
    throw new Error(
      'IframeBridge is not loaded: a tool tab runs inside visualizer-on-tabs.',
    );
  }
  const bridge = globalThis.IframeBridge;
  let site = null;
  let wantedUuid = null;
  // The entry the site is working on, and what saves into it.
  let opened = null;

  function onOutput(answer) {
    if (opened === null || answer.document !== opened.document) return;
    const { title } = opened;
    opened.saver.request().catch((error) => {
      UI.showNotification(
        `What ${title} gave back could not be saved: ${error.message}`,
        'error',
      );
    });
  }

  bridge.onMessage(async (message) => {
    if (message.type !== 'tab.data') return;
    const { couchDB, uuid, data } = message.message ?? {};
    let record;
    try {
      record = toolRecord(data);
    } catch (error) {
      UI.showNotification(error.message, 'error');
      return;
    }
    if (site === null) {
      site = frameSite(container ?? wholeTab(), record, hostName, onOutput);
    }
    if (!uuid || uuid === wantedUuid) return;
    wantedUuid = uuid;
    try {
      const { roc, entry, files } = await readEntry(couchDB, uuid, record);
      // Another entry may have been asked for while this one was loading.
      if (wantedUuid !== uuid) return;
      const request = entryLoad({
        database: couchDB.database,
        uuid,
        entry,
        files,
        record,
      });
      opened = {
        document: request.document,
        title: record.title,
        saver: createEntrySaver({
          record,
          files,
          ask: (keys) => site.get(keys),
          fetch: () => roc.get(uuid),
          update: (latest) => roc.update(latest, { muteSuccess: true }),
          attach: (latest, attachments) =>
            roc.addAttachment(latest, attachments, { muteSuccess: true }),
        }),
      };
      site.load(request);
    } catch (error) {
      wantedUuid = null;
      UI.showNotification(
        `The ${record.entry} could not be read, so ${record.title} shows nothing of it: ${error.message}`,
        'error',
      );
    }
  });
  bridge.ready();
}

/**
 * The entry the tab was opened for, as plain JSON, with the text of the files
 * its readers need, and the client that saves into it.
 */
async function readEntry(couchDB, uuid, record) {
  let roc;
  let entry;
  if (record.entry === 'sample') {
    const sample = new Sample(couchDB, uuid, { track: false });
    await sample.waitSampleLoaded();
    roc = sample.roc;
    entry = DataObject.resurrect(sample.sample);
  } else {
    roc = new Roc({
      url: couchDB.url,
      database: couchDB.database,
      kind: record.entry,
      processor: elnPlugin,
    });
    entry = DataObject.resurrect(await roc.get(uuid));
    // A tile hands over whatever is selected: never write a reaction's fields
    // into a sample.
    if (entry?.$kind !== record.entry) {
      throw new Error(
        `it is a ${entry?.$kind ?? 'missing entry'}, not a ${record.entry}`,
      );
    }
  }
  const files = {};
  for (const name of filesToRead(entry, record.read)) {
    files[name] = String(await roc.getAttachment(entry, name));
  }
  return { roc, entry, files };
}

/** An element laid over the whole tab: the view's grid stays empty under it. */
function wholeTab() {
  const element = document.createElement('div');
  element.style.position = 'fixed';
  element.style.inset = '0';
  element.style.zIndex = '1';
  element.style.background = '#fff';
  document.body.append(element);
  return element;
}

function frameSite(container, record, hostName, onOutput) {
  const frame = document.createElement('iframe');
  frame.title = record.title;
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';
  // A cross-origin frame gets neither unless delegated before it navigates.
  frame.allow = 'clipboard-write; fullscreen';
  const connection = connectSite({
    target: () => frame.contentWindow,
    origin: new URL(record.url).origin,
    name: hostName,
    listen(listener) {
      globalThis.addEventListener('message', listener);
      return () => {
        globalThis.removeEventListener('message', listener);
      };
    },
    onAnswer(answer) {
      if (answer?.type === 'output') {
        onOutput(answer);
        return;
      }
      if (answer?.type !== 'result' || answer.ok !== false) return;
      UI.showNotification(
        answer.error?.message ?? `${record.title} could not use this sample.`,
        'warning',
      );
    },
  });
  // Listening first, framing second, so the site's hello cannot be missed.
  frame.src = record.url;
  container.replaceChildren(frame);
  return connection;
}
