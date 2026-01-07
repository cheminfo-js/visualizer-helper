module.exports = {
  async getNextID(roc, prefix) {
    let v = await roc.view('sampleId', {
      reduce: true
    });

    if (!v.length || !v[0].value || !v[0].value[prefix]) {
      return `${prefix}-000001-${getCheckDigit(1)}`;
    }

    let id = v[0].value[prefix];
    let current = Number(id);
    let nextID = current + 1;
    let check = getCheckDigit(nextID);
    let nextIDStr = String(nextID);
    return `${prefix}-${'0'.repeat(6 - nextIDStr.length)}${nextIDStr}-${check}`;
  }
};

function getCheckDigit(number) {
  let str = number.toString();
  let strlen = str.length;
  let idx = 1;
  let total = 0;
  for (let i = strlen - 1; i >= 0; i--) {
    let el = +str.charAt(i);
    total += el * idx++;
  }
  let checkDigit = total % 10;
  return checkDigit;
}
