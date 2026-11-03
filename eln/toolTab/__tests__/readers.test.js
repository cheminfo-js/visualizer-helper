const sample = require('../../__tests__/data/sample.json');
const { entryLoad, filesToRead, readItems } = require('../readers');
const { toolRecord } = require('../tools');

const reaction = require('./data/esterification.json');

const { general } = sample.$content;

test('the structure is offered in the three forms the sample keeps', () => {
  expect(readItems(sample, ['structure'])).toStrictEqual([
    {
      kind: 'chem.molfile.2d',
      value: { molfile: general.molfile },
      label: 'Ethylbenzene',
    },
    {
      kind: 'chem.ocl.id',
      value: { idCode: 'daD@@DjUZxHH@@', coordinates: general.ocl.coordinates },
      label: 'Ethylbenzene',
    },
    { kind: 'chem.mf', value: { mf: 'C8H10' } },
  ]);
});

test('the molfile goes as it is stored, header lines included', () => {
  const molfile =
    '\n  Actelion Java MolfileCreator 1.0\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  expect(
    readItems({ $content: { general: { molfile } } }, ['structure']),
  ).toStrictEqual([{ kind: 'chem.molfile.2d', value: { molfile } }]);
});

test('a title names the items before any name does', () => {
  const titled = {
    $content: {
      general: {
        title: ' Benzene, dried ',
        name: [{ value: 'benzene' }],
        mf: 'C6H6',
        ocl: { value: 'gFp@DiTt@@@' },
      },
    },
  };

  expect(readItems(titled, ['structure'])).toStrictEqual([
    {
      kind: 'chem.ocl.id',
      value: { idCode: 'gFp@DiTt@@@', coordinates: '' },
      label: 'Benzene, dried',
    },
    { kind: 'chem.mf', value: { mf: 'C6H6' } },
  ]);
});

test('a sample with no structure offers nothing', () => {
  expect(
    readItems({ $content: { general: { molfile: '  ', mf: '' } } }, [
      'structure',
    ]),
  ).toStrictEqual([]);
  expect(readItems({}, ['structure'])).toStrictEqual([]);
});

test('a reader that does not exist is refused', () => {
  expect(() => readItems(sample, ['structure', 'spectra:nmr'])).toThrow(
    'No reader is named "spectra:nmr"; the readers are structure, reaction, drawing.',
  );
});

const DRAWING =
  '<svg xmlns="http://www.w3.org/2000/svg"><g data-draw="1"/></svg>';

test('a reaction is offered as its RXN file, named by its title', () => {
  expect(readItems(reaction, ['reaction'])).toStrictEqual([
    {
      kind: 'chem.rxn',
      value: { rxn: reaction.$content.reactionRXN },
      label: 'Esterification',
    },
  ]);
});

test('a reaction with no title is named by its code', () => {
  const untitled = { ...reaction, $content: { reactionRXN: 'RXN' } };

  expect(readItems(untitled, ['reaction'])[0].label).toBe('R-0042');
  expect(
    readItems({ $id: ['lp', 'R12'], $content: { reactionRXN: 'RXN' } }, [
      'reaction',
    ])[0].label,
  ).toBe('lp R12');
});

test('a reaction not drawn yet offers nothing', () => {
  expect(
    readItems({ $content: { reactionRXN: '' } }, ['reaction', 'drawing']),
  ).toStrictEqual([]);
});

test('the drawing is fetched only when the entry has one, and offered as SVG', () => {
  expect(filesToRead(reaction, ['reaction', 'drawing'])).toStrictEqual([
    'overview.svg',
  ]);
  expect(filesToRead(reaction, ['reaction'])).toStrictEqual([]);
  expect(filesToRead({ $content: {} }, ['drawing'])).toStrictEqual([]);

  expect(
    readItems(reaction, ['drawing'], { 'overview.svg': DRAWING }),
  ).toStrictEqual([{ kind: 'image.svg', value: { svg: DRAWING } }]);
});

test('draw is handed the reaction and its drawing, and takes both back', () => {
  expect(
    entryLoad({
      database: 'eln',
      uuid: reaction._id,
      entry: reaction,
      files: { 'overview.svg': DRAWING },
      record: toolRecord({ tool: 'draw' }),
    }),
  ).toStrictEqual({
    document: 'eln:6f0c2e7a91d34b8f9a2b5d3e4c1a7b90',
    items: [
      {
        kind: 'chem.rxn',
        value: { rxn: reaction.$content.reactionRXN },
        label: 'Esterification',
      },
      { kind: 'image.svg', value: { svg: DRAWING } },
    ],
    accept: ['reaction', 'drawing'],
  });
});
