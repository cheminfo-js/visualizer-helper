let trackThrottle;

import API from 'src/util/api';
import _ from 'lodash';

export default function trackMove(action) {
  if (!trackThrottle) {
    trackThrottle = _.throttle((action) => {
      generateTrackAnnotations(action);
    }, 100);
  }
  trackThrottle(action);
}

function generateTrackAnnotations(action) {
  const trackMove = action.value.data;
  const preferences = API.getData('preferences').resurrect();
  if (!API.getData('chart')) return;
  const chart = API.getData('chart').resurrect();
  const spectrumIDs = chart.series.map((serie) => serie.id);
  if (
    !preferences.display ||
    !preferences.display.trackingInfo ||
    !trackMove ||
    Object.keys(trackMove).length === 0
  ) {
    API.createData('trackAnnotations', []);
    return;
  }
  const selectedSpectra = API.getData('selectedSpectra');
  const analysesManager = API.cache('analysesManager');

  let data;
  if (analysesManager.getAnalysisBySpectrumId) {
    function getColor(spectrumId) {
      const analysis = analysesManager.getAnalysisBySpectrumId(spectrumId);
      if (!analysis) return;
      // selectedSpectra is actually selectedAnalyses
      const currentSpectrum = selectedSpectra.filter(
        (spectrum) => spectrum.id === analysis.id,
      );
      if (currentSpectrum.length === 0) return;
      return currentSpectrum[0].color;
    }

    function getLabel(spectrumId) {
      const analysis = analysesManager.getAnalysisBySpectrumId(spectrumId);
      if (!analysis) return;
      console.log(analysis);
      return analysis.label;
    }

    // we will get the index for all the charts
    let keys = Object.keys(trackMove);
    data = new Array(keys.length);
    for (let key of keys) {
      let index = Number(key.replace(/chart-?/, '') || 0);
      let spectrumId = spectrumIDs[index];
      data[index] = {
        x: trackMove[key].xClosest,
        y: trackMove[key].yClosest,
        color: getColor(spectrumId),
        label: getLabel(spectrumId),
        spectrum: analysesManager.getSpectrumById(spectrumId),
      };
    }
  } else {
    let ids = selectedSpectra
      .filter((entry) => DataObject.resurrect(entry.display))
      .map((entry) => String(entry.id));
    let colors = selectedSpectra
      .filter((entry) => DataObject.resurrect(entry.display))
      .map((entry) => String(entry.color));
    const spectra = API.cache('analysesManager').getAnalyses({ ids });
    // we will get the index for all the charts
    let keys = Object.keys(trackMove);
    data = new Array(keys.length);
    for (let key of keys) {
      let index = Number(key.replace(/chart-?/, '') || 0);
      data[index] = {
        x: trackMove[key].xClosest,
        y: trackMove[key].yClosest,
        color: colors[index],
        label: spectra[index].label,
        spectrum: spectra[index],
      };
    }
  }

  let trackAnnotations = getTrackAnnotations(data);
  API.createData('trackAnnotations', trackAnnotations);

  function getTrackAnnotations(data, options = {}) {
    const { showSpectrumID = true, startX = 300 } = options;
    let annotations = [];

    let line = 0;

    if (isNaN(data[0].x)) return;
    annotations.push({
      type: 'line',
      position: [
        { x: `${startX}px`, y: `${15 + 15 * line}px` },
        { x: `${startX + 15}px`, y: `${15 + 15 * line}px` },
      ],
      strokeWidth: 0.0000001,
      label: {
        size: 16,
        text: `x: ${data[0].x.toPrecision(6)}`,
        position: { x: `${startX + 60}px`, y: `${20 + 15 * line}px` },
      },
    });
    line++;

    for (let datum of data) {
      if (isNaN(datum.y)) continue;
      annotations.push({
        type: 'line',
        position: [
          { x: `${startX}px`, y: `${15 + 15 * line}px` },
          { x: `${startX + 15}px`, y: `${15 + 15 * line}px` },
        ],
        strokeColor: datum.color,
        strokeWidth: 2,
        label: {
          text: `${datum.y.toPrecision(4)}${
            showSpectrumID ? ` - ${datum.label}` : ''
          }`,
          position: { x: `${startX + 20}px`, y: `${20 + 15 * line}px` },
        },
      });
      line++;
    }

    return annotations;
  }
}
