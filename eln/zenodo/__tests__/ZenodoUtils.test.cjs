'use strict';

const {join} = require('path');
const {readFileSync} = require('fs');

const {getMDTable, getReadmeForDeposition, getReadmeForSample,} = require('../ZenodoUtils');

const samples = JSON.parse(
  readFileSync(join(__dirname, 'samples.json'), 'utf8'),
);

const deposition = JSON.parse(
  readFileSync(join(__dirname, 'deposition.json'), 'utf8'),
);


test('MD Table Generation', () => {
  const header = { name: 'Name', age: 'Age' };
  const rows = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
    { name: 'Charlie', age: 35 },
  ];
  const expected = `| Name    | Age |
|---------|-----|
| Alice   | 30  |
| Bob     | 25  |
| Charlie | 35  |`;
  const result = getMDTable(header, rows);
  expect(result).toBe(expected);
});

test('Longer header', () => {
  const header = {
    fullName: 'Full Name',
    occupation: 'Occupation',
  };

  const rows = [
    { fullName: 'Alice', occupation: 'Engineer' },
    { fullName: 'Bob', occupation: 'Designer' },
  ];
  const expected = `| Full Name | Occupation |
|-----------|------------|
| Alice     | Engineer   |
| Bob       | Designer   |`;
  const result = getMDTable(header, rows);
  expect(result).toBe(expected);
});
test('Readme for sample', () => {
  const sample = samples[0];
  const result = getReadmeForSample(sample);
  expect(result).toBeDefined();
  expect(result).toMatchSnapshot();
});

test('Readme for deposition', () => {
  const result = getReadmeForDeposition(deposition);
  expect(result).toBeDefined();
  //  expect(result).toMatchSnapshot();
});
