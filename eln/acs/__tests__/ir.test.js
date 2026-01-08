let toHTML = require('../ir');

let entry = {
  peak: [
    { wavenumber: 1000, transmittance: 10, kind: 'w' },
    { wavenumber: 2000, transmittance: 50, kind: 'm' },
    { wavenumber: 3000, transmittance: 100, kind: 'S' },
  ],
};

describe('ACS string for IR spectrum', () => {
  it('default options', () => {
    let html = toHTML(entry, {});
    expect(html).toBe(
      'IR (cm<sup>-1</sup>): 3000<i>S</i>, 2000<i>m</i>, 1000<i>w</i>',
    );
  });

  it('ascending order', () => {
    let html = toHTML(entry, { ascending: true });
    expect(html).toBe(
      'IR (cm<sup>-1</sup>): 1000<i>w</i>, 2000<i>m</i>, 3000<i>S</i>',
    );
  });
});
