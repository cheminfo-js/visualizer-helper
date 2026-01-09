define([
  'https://www.lactame.com/lib/chemcalc/3.0.6/chemcalc.js',
  'https://www.lactame.com/lib/ml/1.0.0/ml.js',
], (CC, ml) => {
  let exports = {};
  exports.findCoefficients = function findCoefficient(reagents, products) {
    let atoms = {};

    let nbCoeff = reagents.length + products.length;
    let matrix = new Array(nbCoeff);
    for (let i = 0; i < nbCoeff; i++) {
      matrix[i] = [];
    }

    for (let i = 0; i < reagents.length; i++) {
      const c = CC.analyseMF(reagents[i]);
      const part = c.parts[0];
      for (let k = 0; k < part.ea.length; k++) {
        const ea = part.ea[k];
        atoms[ea.element] = true;
        const idx = Object.keys(atoms).indexOf(ea.element);
        matrix[i][idx] = part.ea[k].number;
      }
    }

    for (let i = reagents.length; i < nbCoeff; i++) {
      const c = CC.analyseMF(products[i - reagents.length]);
      const part = c.parts[0];
      for (let k = 0; k < part.ea.length; k++) {
        const ea = part.ea[k];
        atoms[ea.element] = true;
        const idx = Object.keys(atoms).indexOf(ea.element);
        matrix[i][idx] = part.ea[k].number;
      }
    }

    let nbAtoms = Object.keys(atoms).length;
    for (let i = 0; i < nbCoeff; i++) {
      for (let j = 0; j < nbAtoms; j++) {
        if (matrix[i][j] === undefined) {
          matrix[i][j] = 0;
        }
        if (i >= reagents.length) {
          matrix[i][j] = -matrix[i][j];
        }
      }
    }

    matrix = new ml.Matrix(matrix).transpose();

    let result;
    if (!matrix.isSquare()) {
      if (matrix.rows - matrix.columns === -1) {
        const trivialRow = new Array(matrix.columns).fill(0);
        trivialRow[0] = 1;
        const e = new Array(matrix.columns).fill([0]);
        e[matrix.columns - 1] = [1];
        matrix.addRow(matrix.rows, trivialRow);

        result = matrix.solve(e);
      } else {
        console.warn('cannot solve'); // eslint-disable-line no-console
      }
    } else {
      // eslint-disable-next-line new-cap
      const LU = ml.Matrix.Decompositions.LU(matrix);
      if (LU.isSingular()) {
        let diag0Pos = findDiag0Pos(LU.LU);
        const idx = LU.pivotVector.indexOf(diag0Pos);
        const trivialRow = new Array(matrix.columns).fill(0);
        trivialRow[idx] = 1;
        const e = new Array(matrix.columns).fill([0]);
        e[idx] = [1];
        matrix.setRow(idx, trivialRow);
        result = matrix.solve(e);
      } else {
        console.warn('cannot solve this case'); // eslint-disable-line no-console
      }
    }
    if (!result) return null;
    result = result.map((r) => r[0]);
    return result;
  };

  exports.formatResult = function formatResult(reagents, products, result) {
    let rstr = reagents
      .map((value, index) => {
        return `<span style="color:red;">${result[index]}</span>${value}`;
      })
      .join(' + ');

    let pstr = products
      .map((value, index) => {
        return `<span style="color:red;">${
          result[reagents.length + index]
        }</span>${value}`;
      })
      .join(' + ');

    let str = `${rstr} → ${pstr}`;
    return str;
  };

  function findDiag0Pos(matrix) {
    for (let i = 0; i < matrix.rows; i++) {
      // eslint-disable-next-line no-compare-neg-zero
      if (matrix[i][i] === 0 || matrix[i][i] === -0) return i;
    }
    return null;
  }

  return exports;
});
