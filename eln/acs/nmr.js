import SD from '../libs/SD';

export default function toHTML(value) {
  let acsString = '';
  if (value && value.range) {
    const ranges = new SD.Ranges(value.range);
    let nucleus = '1H';
    if (!Array.isArray(value.nucleus)) nucleus = [value.nucleus];
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
