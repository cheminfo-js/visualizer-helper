const { migrateIupac } = require('../sampleMigrations');

const sample = require('./data/sample.json');

test('kind: true is migrated to iupac', () => {
  const s = {
    $content: { general: { name: [{ value: 'ethylbenzene', kind: true }] } },
  };
  migrateIupac(s);
  expect(s.$content.general.name[0].kind).toBe('iupac');
});

test('kind: false is migrated to trivial', () => {
  const s = { $content: { general: { name: [{ value: 'EB', kind: false }] } } };
  migrateIupac(s);
  expect(s.$content.general.name[0].kind).toBe('trivial');
});

test('kind: undefined is migrated to iupac', () => {
  const s = {
    $content: {
      general: { name: [{ value: 'ethylbenzene', kind: undefined }] },
    },
  };
  migrateIupac(s);
  expect(s.$content.general.name[0].kind).toBe('iupac');
});

test('already-migrated string kind is left unchanged', () => {
  const s = {
    $content: {
      general: {
        name: [
          { value: 'ethylbenzene', kind: 'iupac' },
          { value: 'EB', kind: 'trivial' },
        ],
      },
    },
  };
  migrateIupac(s);
  expect(s.$content.general.name[0].kind).toBe('iupac');
  expect(s.$content.general.name[1].kind).toBe('trivial');
});

test('multiple entries with mixed kinds are all migrated', () => {
  const s = {
    $content: {
      general: {
        name: [
          { value: 'a', kind: true },
          { value: 'b', kind: false },
          { value: 'c' },
        ],
      },
    },
  };
  migrateIupac(s);
  expect(s.$content.general.name[0].kind).toBe('iupac');
  expect(s.$content.general.name[1].kind).toBe('trivial');
  expect(s.$content.general.name[2].kind).toBe('iupac');
});

test('sample without boolean kind does not throw', () => {
  expect(() => migrateIupac(sample)).not.toThrow();
});
