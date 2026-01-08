module.exports = {
  async getNextId(roc, viewName, type) {
    const v = await roc.view(viewName, {
      reduce: true,
    });

    if (!v.length || !v[0].value || !v[0].value[type]) {
      return `${type}-000001-${getCheckDigit(1)}`;
    }

    let id = v[0].value[type];
    let current = Number(id);
    let nextID = current + 1;
    return numberToId(nextID, type);
  },
  numberToId,
};

function numberToId(num, type) {
  let check = getCheckDigit(num);
  let numStr = String(num);
  return `${type}-${'0'.repeat(6 - numStr.length)}${numStr}-${check}`;
}

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
