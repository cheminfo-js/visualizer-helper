const { connectSite } = require('../hostConnection');

const SITE_ORIGIN = 'https://3d.cheminfo.org';

/** Every site a test starts, closed after it whatever happened. */
const started = [];

afterEach(() => {
  for (const site of started.splice(0)) site.close();
});

/**
 * A message as the test's own objects: what a port delivers is built in Node's
 * realm, not in the one jest runs the test in, and `toStrictEqual` compares
 * prototypes.
 */
function inTestRealm(message) {
  return JSON.parse(JSON.stringify(message));
}

/**
 * A framed site, faked: it records what the host posts to its window, and says
 * hello when told to. The ports are real, so every message is cloned as in a
 * browser.
 */
function startSite({ timeout } = {}) {
  const posted = [];
  const frameWindow = {
    postMessage(message, targetOrigin, transfer) {
      posted.push({ message, targetOrigin, port: transfer?.[0] });
    },
  };
  const answers = [];
  let listener = null;
  const connection = connectSite({
    target: () => frameWindow,
    origin: SITE_ORIGIN,
    name: 'Test ELN',
    timeout,
    listen(next) {
      listener = next;
      return () => {
        listener = null;
      };
    },
    onAnswer(answer) {
      answers.push(inTestRealm(answer));
    },
  });

  const site = {
    connection,
    posted,
    answers,
    frameWindow,
    isListening: () => listener !== null,
    /** Wait until the site has answered `count` times. */
    async answered(count) {
      while (answers.length < count) {
        await new Promise((resolve) => {
          setTimeout(resolve, 5);
        });
      }
      return answers;
    },
    hello({ source = frameWindow, origin = SITE_ORIGIN, version = 1 } = {}) {
      listener?.({
        source,
        origin,
        data: { type: 'cheminfo:hello', version, tool: { name: '3d' } },
      });
    },
    close() {
      connection.close();
      for (const { port } of posted) port?.close();
    },
  };
  started.push(site);
  return site;
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

const LOAD = {
  document: 'eln:1315a6d895f431497538cb6d834feab5',
  items: [{ kind: 'chem.mf', value: { mf: 'C8H10' } }],
  accept: [],
};

test('only the frame, from the site, in this version, is answered', () => {
  const site = startSite();
  site.hello({ source: {} });
  site.hello({ origin: 'https://elsewhere.example' });
  site.hello({ version: 2 });

  expect(site.posted).toStrictEqual([]);

  site.hello();

  expect(site.posted).toHaveLength(1);
  expect(site.posted[0].message).toStrictEqual({
    type: 'cheminfo:connect',
    version: 1,
    host: { name: 'Test ELN' },
  });
  expect(site.posted[0].targetOrigin).toBe(SITE_ORIGIN);
  expect(site.posted[0].port).toBeInstanceOf(MessagePort);
});

test('a load waits for the site, then goes through its port', async () => {
  const site = startSite();
  site.connection.load(LOAD);
  site.hello();

  expect(await nextMessage(site.posted[0].port)).toStrictEqual({
    type: 'load',
    id: 'load-1',
    ...LOAD,
  });
});

test('what the site answers is handed back', async () => {
  const site = startSite();
  site.hello();
  const result = {
    type: 'result',
    id: 'load-1',
    ok: false,
    error: {
      code: 'no-input',
      message: 'No item is a chem.molfile, chem.ocl.id, or chem.smiles.',
    },
  };
  site.posted[0].port.postMessage(result);

  expect(await site.answered(1)).toStrictEqual([result]);
});

test('a site that says hello again gets a new port and the load again', async () => {
  const site = startSite();
  site.connection.load(LOAD);
  site.hello();
  await nextMessage(site.posted[0].port);
  site.hello();

  expect(site.posted).toHaveLength(2);
  expect(await nextMessage(site.posted[1].port)).toStrictEqual({
    type: 'load',
    id: 'load-2',
    ...LOAD,
  });
});

test('closing stops listening', () => {
  const site = startSite();
  site.hello();
  site.connection.close();

  expect(site.isListening()).toBe(false);
});

test("a get goes through the port and resolves with the site's items", async () => {
  const site = startSite();
  site.hello();
  const { port } = site.posted[0];
  const asked = nextMessage(port);
  const answer = site.connection.get(['reaction', 'drawing']);

  expect(await asked).toStrictEqual({
    type: 'get',
    id: 'get-1',
    keys: ['reaction', 'drawing'],
  });

  const items = [
    { key: 'reaction', kind: 'chem.rxn', value: { rxn: '$RXN' } },
    { key: 'drawing', kind: 'image.svg', value: { svg: '<svg/>' } },
  ];
  port.postMessage({ type: 'result', id: 'get-1', ok: true, items });

  expect(inTestRealm(await answer)).toStrictEqual(items);
  expect(site.answers).toStrictEqual([]);
});

test('a get the site refuses fails with its sentence', async () => {
  const site = startSite();
  site.hello();
  const answer = site.connection.get(['drawing']);
  site.posted[0].port.postMessage({
    type: 'result',
    id: 'get-1',
    ok: false,
    error: { code: 'no-output', message: 'Nothing is drawn yet.' },
  });

  await expect(answer).rejects.toThrow('Nothing is drawn yet.');
});

test('a get is given up before the site connects, across a reload, or past its time', async () => {
  const site = startSite({ timeout: 20 });

  await expect(site.connection.get(['reaction'])).rejects.toThrow(
    'The site is not connected yet.',
  );

  site.hello();
  const beforeReload = site.connection.get(['reaction']);
  site.hello();

  await expect(beforeReload).rejects.toThrow(
    'The site reloaded before it answered.',
  );
  await expect(site.connection.get(['reaction'])).rejects.toThrow(
    'The site did not answer in time.',
  );
});

test('what the site sends unasked still reaches the tab', async () => {
  const site = startSite();
  site.hello();
  const output = {
    type: 'output',
    document: LOAD.document,
    items: [{ key: 'reaction', kind: 'chem.rxn', value: { rxn: '$RXN' } }],
  };
  site.posted[0].port.postMessage(output);

  expect(await site.answered(1)).toStrictEqual([output]);
});
