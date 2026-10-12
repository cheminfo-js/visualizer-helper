const { TOOLS, toolRecord } = require('../tools');

test('a tile naming a tool gets its record', () => {
  expect(toolRecord({ tool: '3d' })).toStrictEqual({
    title: '3D model',
    url: 'https://3d.cheminfo.org/?embed=1',
    read: ['structure'],
    save: {},
  });
});

test('a tile overrides the fields it gives, and keeps the others', () => {
  const save = {
    'chem.molfile.3d.h.energy': { writer: 'attachment', type: 'model3d' },
  };

  expect(toolRecord({ tool: '3d', save })).toStrictEqual({
    title: '3D model',
    url: 'https://3d.cheminfo.org/?embed=1',
    read: ['structure'],
    save,
  });
});

test('a tile may frame a site of its own, named after its host', () => {
  expect(
    toolRecord({ url: 'https://lcao.cheminfo.org/?embed=1' }),
  ).toStrictEqual({
    title: 'lcao.cheminfo.org',
    url: 'https://lcao.cheminfo.org/?embed=1',
    read: ['structure'],
    save: {},
  });
});

test('data typed as JSON text in a tiles grid reads the same', () => {
  expect(toolRecord('{ "tool": "3d" }')).toStrictEqual(
    toolRecord({ tool: '3d' }),
  );
  expect(() => toolRecord('3d')).toThrow(
    "The tile's data is not JSON (3d), so nothing was opened.",
  );
});

test('a tool this version does not know opens nothing', () => {
  expect(() => toolRecord({ tool: 'lcao' })).toThrow(
    'No tool is named "lcao" in this version of visualizer-helper, so nothing was opened.',
  );
  expect(() => toolRecord({ tool: 'toString' })).toThrow(
    'No tool is named "toString"',
  );
});

test('a tile with neither a tool nor a url opens nothing', () => {
  expect(() => toolRecord()).toThrow(
    'The tile names no tool and gives no url, so nothing was opened.',
  );
});

test('only an http(s) address is framed', () => {
  expect(() => toolRecord({ url: 'data:text/html,hello' })).toThrow(
    '"data:text/html,hello" is not an http(s) address, so nothing was opened.',
  );
  expect(() => toolRecord({ url: 'not an address' })).toThrow(
    '"not an address" is not an http(s) address, so nothing was opened.',
  );
});

test('every registered tool is framed over https', () => {
  for (const [name, record] of Object.entries(TOOLS)) {
    expect([name, new URL(record.url).protocol]).toStrictEqual([
      name,
      'https:',
    ]);
  }
});
