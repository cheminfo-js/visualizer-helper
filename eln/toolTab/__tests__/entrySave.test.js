const { createEntrySaver } = require('../entrySave');
const { toolRecord } = require('../tools');

const record = toolRecord({ tool: 'draw' });

const RXN = '$RXN\n\n\n\n  1  1\n$MOL\n';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>';

/**
 * A reaction in a fake database, and a fake draw answering `get` with what is
 * on its canvas. Every call is logged in order.
 */
function setUp({ files = {}, canvas = { rxn: RXN, svg: SVG } } = {}) {
  const calls = [];
  const stored = { _id: 'r1', _rev: '1', $content: { reactionRXN: 'old' } };
  const saver = createEntrySaver({
    record,
    files,
    async ask(keys) {
      calls.push(['ask', keys]);
      return [
        { key: 'reaction', kind: 'chem.rxn', value: { rxn: canvas.rxn } },
        { key: 'drawing', kind: 'image.svg', value: { svg: canvas.svg } },
      ];
    },
    async fetch() {
      calls.push(['fetch']);
      return structuredClone(stored);
    },
    async update(entry) {
      calls.push(['update', entry.$content.reactionRXN]);
      stored.$content = entry.$content;
    },
    async attach(entry, attachments) {
      calls.push(['attach', attachments.map((file) => file.filename)]);
    },
  });
  return { saver, calls, canvas };
}

test('a change saves the RXN file and the drawing, from the latest revision', async () => {
  const { saver, calls } = setUp();
  await saver.request();

  expect(calls).toStrictEqual([
    ['ask', ['reaction', 'drawing']],
    ['fetch'],
    ['update', RXN],
    ['attach', ['overview.svg']],
  ]);
});

test('what the entry already holds is not written again', async () => {
  const { saver, calls } = setUp({ files: { 'overview.svg': SVG } });
  await saver.request();
  await saver.request();

  expect(calls).toStrictEqual([
    ['ask', ['reaction', 'drawing']],
    ['fetch'],
    ['update', RXN],
    ['ask', ['reaction', 'drawing']],
    ['fetch'],
  ]);
});

test('a site with nothing to give back leaves the entry as it was', async () => {
  const { saver, calls } = setUp({ canvas: { rxn: '', svg: '' } });
  await saver.request();

  expect(calls).toStrictEqual([['ask', ['reaction', 'drawing']]]);
});

test('changes during a save are saved once after it, never beside it', async () => {
  const { saver, calls, canvas } = setUp();
  const first = saver.request();
  canvas.rxn = `${RXN}2`;
  const second = saver.request();
  const third = saver.request();
  await Promise.all([first, second, third]);

  // The first save read the canvas before it changed; the two requests made
  // during it are one more save, which writes the reaction alone.
  expect(calls).toStrictEqual([
    ['ask', ['reaction', 'drawing']],
    ['fetch'],
    ['update', RXN],
    ['attach', ['overview.svg']],
    ['ask', ['reaction', 'drawing']],
    ['fetch'],
    ['update', `${RXN}2`],
  ]);
});
