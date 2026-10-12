/**
 * A tool tab: a view of visualizer-on-tabs that frames one of the cheminfo
 * sites and hands it the sample the tab was opened for, over the cheminfo host
 * protocol.
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

import Sample from '../Sample';

import { connectSite } from './hostConnection';
import { readItems } from './readers';
import { toolRecord } from './tools';

/**
 * Make the view a tool tab.
 *
 * A tab opened with no sample — a tile of kind `optionalSample` with nothing
 * selected — frames the site alone. The same tab handed another sample sends
 * that one through the same port, without reloading the site; the same sample
 * again changes nothing.
 *
 * @param {object} [options] - Where the site goes, and how the tab presents
 * itself.
 * @param {HTMLElement} [options.container] - The element the site fills.
 * Defaults to one laid over the whole tab, so the view needs no module.
 * @param {string} [options.hostName] - How the tab calls itself to the site.
 * Defaults to `'ELN'`.
 */
export function startToolTab(options = {}) {
  const { container, hostName = 'ELN' } = options;
  if (typeof IframeBridge === 'undefined') {
    throw new Error(
      'IframeBridge is not loaded: a tool tab runs inside visualizer-on-tabs.',
    );
  }
  const bridge = globalThis.IframeBridge;
  let site = null;
  let wantedUuid = null;

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
      site = frameSite(container ?? wholeTab(), record, hostName);
    }
    if (!uuid || uuid === wantedUuid) return;
    wantedUuid = uuid;
    try {
      const sample = new Sample(couchDB, uuid, { track: false });
      await sample.waitSampleLoaded();
      // Another sample may have been asked for while this one was loading.
      if (wantedUuid !== uuid) return;
      site.load({
        document: `${couchDB.database}:${uuid}`,
        items: readItems(DataObject.resurrect(sample.sample), record.read),
        accept: Object.keys(record.save),
      });
    } catch (error) {
      wantedUuid = null;
      UI.showNotification(
        `The sample could not be read, so ${record.title} shows nothing of it: ${error.message}`,
        'error',
      );
    }
  });
  bridge.ready();
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

function frameSite(container, record, hostName) {
  const frame = document.createElement('iframe');
  frame.title = record.title;
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';
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
