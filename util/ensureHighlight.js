import API from 'src/util/api';

function ensureHighlight(variableName) {
  const array = API.getData(variableName);
  let changed = false;

  if (!array || typeof array[Symbol.iterator] !== 'function') return changed;
  for (let item of array) {
    if (!item._highlight) {
      Object.defineProperty(item, '_highlight', {
        writable: true,
        enumerable: false,
      });
      item._highlight = Math.random();
      changed = true;
    }
  }
  if (changed) array.triggerChange();
  return changed;
}

module.exports = ensureHighlight;
