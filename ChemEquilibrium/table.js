
module.exports = function getTable(sol) {
  let result = [];
  result.push(`x\t${sol.species.join('\t')}`);
  for (let i = 0; i < sol.x.length; i++) {
    let line = [];
    line.push(sol.x[i]);
    for (let specie of sol.species) {
      line.push(sol.solutions[i][specie]);
    }
    result.push(line.join('\t'));
  }
  return result.join('\r\n');
};
