const { toolRecord } = require('../tools');
const { applyContent, savedChanges } = require('../writers');

const { save } = toolRecord({ tool: 'draw' });

const RXN = '$RXN\n\n\n\n  1  1\n$MOL\n';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"/>';

test("draw's reaction goes into $content and its drawing into overview.svg", () => {
  expect(
    savedChanges(
      [
        { key: 'drawing', kind: 'image.svg', value: { svg: SVG } },
        { key: 'reaction', kind: 'chem.rxn', value: { rxn: RXN } },
      ],
      save,
    ),
  ).toStrictEqual({
    content: [{ jpath: ['reactionRXN'], value: RXN }],
    attachments: [
      { filename: 'overview.svg', contentType: 'image/svg+xml', data: SVG },
    ],
  });
});

test('an output the record does not save, or one with no text, is left out', () => {
  expect(
    savedChanges(
      [
        { key: 'structure', kind: 'chem.molfile.2d', value: { molfile: 'M' } },
        { key: 'reaction', kind: 'chem.rxn', value: { rxn: '  ' } },
        { kind: 'chem.rxn', value: { rxn: RXN } },
      ],
      save,
    ),
  ).toStrictEqual({ content: [], attachments: [] });
});

test('a molfile kind under chem.molfile is kept as a molfile file', () => {
  expect(
    savedChanges(
      [{ key: 'model', kind: 'chem.molfile.3d', value: { molfile: 'M3' } }],
      { model: { writer: 'attachment', filename: 'model.mol' } },
    ).attachments,
  ).toStrictEqual([
    {
      filename: 'model.mol',
      contentType: 'chemical/x-mdl-molfile',
      data: 'M3',
    },
  ]);
});

test('a save naming no writer, or no place, is refused', () => {
  const item = { key: 'reaction', kind: 'chem.rxn', value: { rxn: RXN } };

  expect(() => savedChanges([item], { reaction: { writer: 'db' } })).toThrow(
    'No writer is named "db"; the writers are content, attachment.',
  );
  expect(() =>
    savedChanges([item], { reaction: { writer: 'content', jpath: [] } }),
  ).toThrow('"reaction" is saved in $content with no jpath.');
  expect(() =>
    savedChanges([item], { reaction: { writer: 'attachment' } }),
  ).toThrow('"reaction" is saved as a file with no filename.');
  expect(() =>
    savedChanges([item], {
      reaction: { writer: 'content', jpath: ['__proto__', 'x'] },
    }),
  ).toThrow('"reaction" is saved in $content with no jpath.');
});

test('a field is set where its jpath says, and an unchanged one is no change', () => {
  const entry = { $content: { reactionRXN: 'old' } };

  expect(
    applyContent(entry, [
      { jpath: ['reactionRXN'], value: RXN },
      { jpath: ['scheme', 'source'], value: 'draw' },
    ]),
  ).toBe(true);
  expect(entry.$content).toStrictEqual({
    reactionRXN: RXN,
    scheme: { source: 'draw' },
  });
  expect(applyContent(entry, [{ jpath: ['reactionRXN'], value: RXN }])).toBe(
    false,
  );
});
