import { rangesToACS } from '../libs/NMRProcessing';
import SD from '../libs/SD';

const defaultFormats = {
  h: {
    nucleus: '1H',
    deltaFormat: '0.00',
    couplingFormat: '0.0',
    observedFrequency: 200,
  },
  c: {
    nucleus: '13C',
    deltaFormat: '0.0',
    couplingFormat: '0.0',
    observedFrequency: 100,
  },
  f: {
    nucleus: '19F',
    deltaFormat: '0.00',
    couplingFormat: '0.0',
    observedFrequency: 400,
  },
};

export default function toHTML(value) {
  if (
    value &&
    value.nmrium &&
    value.nmrium.ranges &&
    value.nmrium.ranges.values
  ) {
    const { solvent, frequency, nucleus } = value;
    if (!nucleus || !Array.isArray(nucleus)) return '';
    const defaultFormat =
      defaultFormats[nucleus[0].toLowerCase()] || defaultFormats.h;

    return rangesToACS(value.nmrium.ranges.values, {
      nucleus: nucleus[0],
      solvent,
      frequencyObserved: frequency,
      deltaFormat: defaultFormat.deltaFormat,
      couplingFormat: defaultFormat.couplingFormat,
    });
  } else {
    return convertOldFormat(value);
  }
}

function convertOldFormat(value) {
  let acsString = '';
  if (value && value.range) {
    const ranges = new SD.Ranges(value.range);
    let nucleus = '1H';
    if (Array.isArray(value.nucleus)) {
      nucleus = value.nucleus[0];
    } else if (value.nucleus) {
      nucleus = value.nucleus;
    }
    acsString += ranges.getACS({
      nucleus,
      solvent: value.solvent,
      frequencyObserved: value.frequency,
    });
    // remove the last dot if it exists
    if (acsString.endsWith('.')) {
      acsString = acsString.slice(0, -1);
    }
  }
  return acsString;
}
