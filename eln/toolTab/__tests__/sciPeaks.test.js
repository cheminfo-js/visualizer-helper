/**
 * What SciPeaks says to a site, pinned: `data/ethylbenzeneLoad.json` is the
 * message the sites are tested against too — react-cheminfo exports the same
 * one as `SCIPEAKS_ETHYLBENZENE_LOAD` — so a change here that they do not
 * expect fails a test rather than a notebook.
 */

const sample = require('../../__tests__/data/sample.json');
const { DEFAULT_HOST_NAME, connectSite } = require('../hostConnection');
const { entryLoad } = require('../readers');
const { TOOLS, toolRecord } = require('../tools');

const ETHYLBENZENE_LOAD = require('./data/ethylbenzeneLoad.json');

/** Every connection a test opens, closed after it whatever happened. */
const opened = [];

afterEach(() => {
  for (const close of opened.splice(0)) close();
});

/** What a port delivers, as the test realm's own objects. */
function inTestRealm(message) {
  return JSON.parse(JSON.stringify(message));
}

/**
 * The tab, serving a site at `url` that says hello at once.
 *
 * @param {string} url - The site's address, as its record gives it.
 * @param {object} [options] - What `connectSite` takes besides the site.
 * @returns {{ connection: object, connect: Promise<object>, firstLoad:
 * Promise<object>, answers: object[], port: () => MessagePort }} The tab, what
 * it posts to the frame, the first message the site receives, and the answers
 * the tab is handed.
 */
function serveSite(url, options = {}) {
  const origin = new URL(url).origin;
  let resolveConnect;
  const connect = new Promise((resolve) => {
    resolveConnect = resolve;
  });
  let port = null;
  const frameWindow = {
    postMessage(message, targetOrigin, transfer) {
      port = transfer[0];
      resolveConnect({ message: inTestRealm(message), targetOrigin });
    },
  };
  let listener = null;
  const answers = [];
  const connection = connectSite({
    target: () => frameWindow,
    origin,
    listen(next) {
      listener = next;
      return () => {
        listener = null;
      };
    },
    onAnswer(answer) {
      answers.push(inTestRealm(answer));
    },
    ...options,
  });
  opened.push(() => {
    connection.close();
    port?.close();
  });
  return {
    connection,
    connect,
    answers,
    port: () => port,
    hello() {
      listener?.({
        source: frameWindow,
        origin,
        data: { type: 'cheminfo:hello', version: 1, tool: { name: 'site' } },
      });
    },
  };
}

function nextMessage(port) {
  return new Promise((resolve) => {
    port.addEventListener(
      'message',
      (event) => {
        resolve(inTestRealm(event.data));
      },
      { once: true },
    );
    port.start();
  });
}

test('the tab introduces itself as SciPeaks unless told otherwise', async () => {
  expect(DEFAULT_HOST_NAME).toBe('SciPeaks');

  const site = serveSite(TOOLS['3d'].url);
  site.hello();

  expect(await site.connect).toStrictEqual({
    message: {
      type: 'cheminfo:connect',
      version: 1,
      host: { name: 'SciPeaks' },
    },
    targetOrigin: 'https://3d.cheminfo.org',
  });

  const other = serveSite(TOOLS['3d'].url, { name: 'ELN' });
  other.hello();

  expect((await other.connect).message.host).toStrictEqual({ name: 'ELN' });
});

test.each(['3d', 'lcao', 'osiris'])(
  'the ethylbenzene sample reaches %s as the message the sites are tested against',
  async (tool) => {
    const record = toolRecord({ tool });
    const site = serveSite(record.url);
    site.connection.load(
      entryLoad({ database: 'eln', uuid: sample._id, entry: sample, record }),
    );
    site.hello();
    await site.connect;

    expect(await nextMessage(site.port())).toStrictEqual(ETHYLBENZENE_LOAD);
  },
);

test("the site's answers reach the tab as the site wrote them", async () => {
  const site = serveSite(TOOLS.osiris.url);
  site.hello();
  await site.connect;
  // What react-cheminfo answers for that sample, and for one with no structure.
  const taken = {
    type: 'result',
    id: 'load-1',
    ok: true,
    used: [{ key: 'structure', kind: 'chem.molfile.2d' }],
  };
  const refused = {
    type: 'result',
    id: 'load-2',
    ok: false,
    error: {
      code: 'no-input',
      message:
        'No item is a chem.molfile, chem.ocl.id, or chem.smiles, so osiris loaded nothing.',
    },
  };
  site.port().postMessage(taken);
  site.port().postMessage(refused);

  while (site.answers.length < 2) {
    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
  }

  expect(site.answers).toStrictEqual([taken, refused]);
});
