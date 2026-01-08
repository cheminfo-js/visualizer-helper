const sequenceSplitterTest = require('../sequenceSplitter');

test('AAA', () => {
  expect(sequenceSplitterTest('AAA')).toHaveLength(3);
});

test('HAlaAlaAlaOH', () => {
  expect(sequenceSplitterTest('HAlaAlaAlaOH')).toHaveLength(3);
});

test('HAlaAla(H-1OH)AlaOH', () => {
  expect(sequenceSplitterTest('HAlaAla(H-1OH)AlaOH')).toHaveLength(3);
});

test('H(+)AlaAla(H-1OH)AlaOH', () => {
  expect(sequenceSplitterTest('H(+)AlaAla(H-1OH)AlaOH')).toHaveLength(3);
});

test('ForAlaAla(H-1OH)AlaOH', () => {
  expect(sequenceSplitterTest('ForAlaAla(H-1OH)AlaOH')).toHaveLength(3);
});
