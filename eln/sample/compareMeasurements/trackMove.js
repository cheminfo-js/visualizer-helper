import _ from 'lodash';
import API from 'src/util/api';

let trackThrottle;

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
  const measurementIDs = chart.series.map((serie) => serie.id);
  if (
    !preferences.display ||
    !preferences.display.trackingInfo ||
    !trackMove ||
    Object.keys(trackMove).length === 0
  ) {
    API.createData('trackAnnotations', []);
    return;
  }
  const selectedMeasurements = API.getData('selectedMeasurements');
  const analysesManager = API.cache('analysesManager');

  let data;
  // TODO: What should we do with this?
  // eslint-disable-next-line no-constant-condition
  if (false) {
    if (analysesManager.getAnalysisByMeasurementId) {
      function getColor(measurementId) {
        const analysis =
          analysesManager.getAnalysisByMeasurementId(measurementId);
        if (!analysis) return;
        // selectedMeasurements is actually selectedAnalyses
        const currentMeasurement = selectedMeasurements.filter(
          (measurement) => measurement.id === analysis.id,
        );
        if (currentMeasurement.length === 0) return;
        return currentMeasurement[0].color;
      }

      function getLabel(measurementId) {
        const analysis =
          analysesManager.getAnalysisByMeasurementId(measurementId);
        if (!analysis) return;
        return analysis.label;
      }

      // we will get the index for all the charts
      let keys = Object.keys(trackMove);
      data = new Array(keys.length);
      for (let key of keys) {
        let index = Number(key.replace(/chart-?/, '') || 0);
        let measurementId = measurementIDs[index];
        data[index] = {
          x: trackMove[key].xClosest,
          y: trackMove[key].yClosest,
          color: getColor(measurementId),
          label: getLabel(measurementId),
          measurement: analysesManager.getMeasurementById(measurementId),
        };
      }
    } else {
      let ids = selectedMeasurements
        .filter((entry) => DataObject.resurrect(entry.display))
        .map((entry) => String(entry.id));
      let colors = selectedMeasurements
        .filter((entry) => DataObject.resurrect(entry.display))
        .map((entry) => String(entry.color));
      const measurements = API.cache('analysesManager').getAnalyses({ ids });
      // we will get the index for all the charts
      let keys = Object.keys(trackMove);
      data = new Array(keys.length);
      for (let key of keys) {
        let index = Number(key.replace(/chart-?/, '') || 0);
        data[index] = {
          x: trackMove[key].xClosest,
          y: trackMove[key].yClosest,
          color: colors[index],
          label: measurements[index].label,
          measurement: measurements[index],
        };
      }
    }
  }

  let keys = Object.keys(trackMove);
  data = new Array(keys.length);
  for (let key of keys) {
    let index = Number(key.replace(/chart-?/, '') || 0);
    const serie = chart.series[index];
    data[index] = {
      x: trackMove[key].xClosest,
      y: trackMove[key].yClosest,
      color: serie.style[0].style.line.color,
      label: serie.name,
    };
  }

  data = data.filter((data) => data.x);

  let trackAnnotations = getTrackAnnotations(data);
  API.createData('trackAnnotations', trackAnnotations);

  function getTrackAnnotations(data, options = {}) {
    const { showMeasurementID = true, startX = 300 } = options;
    let annotations = [];

    let line = 0;

    if (!data || !data[0] || isNaN(data[0].x)) return;
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
            showMeasurementID ? ` - ${datum.label}` : ''
          }`,
          position: { x: `${startX + 20}px`, y: `${20 + 15 * line}px` },
        },
      });
      line++;
    }

    return annotations;
  }
}
