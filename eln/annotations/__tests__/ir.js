var toAnnotations = require('../ir');

var peaks = [
  { wavenumber: 1000, transmittance: 10, kind: 'w' },
  { wavenumber: 2000, transmittance: 50, kind: 'm' },
  { wavenumber: 3000, transmittance: 100, kind: 'S' },
];

describe('Annotations object for IR spectrum', () => {
  it('default options', () => {
    var annotations = toAnnotations(peaks);
    expect(annotations).toHaveLength(3);
  });
});
