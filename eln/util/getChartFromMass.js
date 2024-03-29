import { convert } from '../libs/jcampconverter';
import { parseXY } from '../libs/parseXY';
// we extract the data from an object
// the data may be in experiment.content
// or in experiment.jcamp.

/**
 * Create a chart object from a clicked row
 * @param {object} experiment
 * @param {object} [options={}]
 * @return {Promise.<{data: [object]}>}
 */
export async function getChartFromMass(experiment, options = {}) {
  const { scaleY } = options;
  if (experiment.jcamp) {
    let name =
      options.name || String(experiment.jcamp.filename).match(/([^/]+)\..+/)[1];
    if (!experiment.jcamp.data && !experiment.jcamp.content) return undefined;

    let data = experiment.jcamp.content
      ? experiment.jcamp.content
      : (await experiment.getChild(['jcamp', 'data'])).get();
    let jcamp = String(data);

    let result = convert(jcamp).flatten[0];
    let points = result.spectra[0].data;
    return {
      data: [
        {
          label: name,
          x: points.x,
          y: rescaleY(points.y, scaleY),
        },
      ],
    };
  } else if (experiment.text) {
    let name =
      options.name || String(experiment.text.filename).match(/([^/]+)\..+/)[1];
    let data = experiment.text.content
      ? experiment.text.content
      : (await experiment.getChild(['text', 'data'])).get();
    let text = String(data);
    let points = parseXY(String(text), {
      arrayType: 'xxyy',
      uniqueX: true,
    });
    return {
      data: [
        {
          label: name,
          x: points[0],
          y: rescaleY(points[1], scaleY),
        },
      ],
    };
  } else {
    throw new Error('the file should be a jcamp or text');
  }

  function rescaleY(ys, scaleY) {
    if (!scaleY) return ys;
    let maxValue = Number.NEGATIVE_INFINITY;
    for (let y of ys) {
      if (y > maxValue) maxValue = y;
    }
    scaleY /= maxValue;
    for (let i = 0; i < ys.length; i++) {
      ys[i] = ys[i] * scaleY;
    }
    return ys;
  }
}
