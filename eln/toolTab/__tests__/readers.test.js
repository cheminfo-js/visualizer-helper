const sample = require('../../__tests__/data/sample.json');
const { readItems } = require('../readers');

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
    'No reader is named "spectra:nmr"; the readers are structure.',
  );
});
