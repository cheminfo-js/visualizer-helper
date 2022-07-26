import API from 'src/util/api';
import trackMove from '../compare/trackMove';
import recalculateCharts from './recalculateCharts';
import Color from 'src/util/color';

const nbColors = 8;
const colors = Color.getDistinctColorsAsString(nbColors);

async function processActions(action) {
  if (!action || !action.name) return;
  switch (action.name) {
    case 'trackMove':
      trackMove(action);
      break;
    case 'recalculateCharts':
      recalculateCharts();
      break;
    case 'measurementInfo':
      const jcampInfo = await API.require('vh/eln/util/jcampInfo');
      console.log(action.value);
      jcampInfo(action.value);
      break;
    case 'removeMeasurement': {
      removeMeasurement(action);
      break;
    }
    case 'setMeasurement': {
      const analysesManager = API.cache('analysesManager');
      let selectedMeasurements = API.getData('selectedMeasurements');
      // should only be used from the home page and the product is 'tocSample'
      let tocSample = API.getData('tocSample');
      analysesManager.analyses.splice(0);
      selectedMeasurements.length = 0;
      let result = await addMeasurement(action, { toc: tocSample });
      API.getData('selectedMeasurements').triggerChange();
      updateDistinctLabelUnits();
      return result;
    }
    case 'addSample':
      await addSample(action);
      API.getData('selectedMeasurements').triggerChange();
      updateDistinctLabelUnits();
      break;
    case 'addMeasurement':
      let result = await addMeasurement(action, {});
      API.getData('selectedMeasurements').triggerChange();
      updateDistinctLabelUnits();
      return result;
    case 'hideMeasurements':
      hideMeasurements();
      break;
    case 'hideAllMeasurements':
      hideAllMeasurements();
      break;
    case 'removeAllMeasurements':
      removeAllMeasurements();
      break;
    case 'showOnlyMeasurements':
      showOnlyMeasurements();
      break;
    case 'showMeasurements':
      showMeasurements();
      break;
    case 'showAllMeasurements':
      showAllMeasurements();
      break;
  }
}

function getSampleID(entry) {
  while ((entry = entry.__parent)) {
    if (entry.$id) return entry.$id.join(' ');
    if (entry.value && entry.value.$id) return entry.value.$id.join(' ');
  }
  return '';
}

async function addSample(action) {
  const entryID = action.value.id;
  const sample = await API.cache('roc').document(entryID);
  const analysesManager = API.cache('analysesManager');
  const target = analysesManager.target;
  if (
    !target ||
    !sample.$content.measurements ||
    !sample.$content.measurements[target]
  ) {
    return;
  }

  for (let i = 0; i < sample.$content.measurements[target].length; i++) {
    const measurement = sample.$content.measurements[target][i];
    await addMeasurement(
      { value: { __name: i, ...measurement } },
      {
        sampleID: sample.$id.join(' '),
        sampleUUID: sample._id,
        measurementUUID: sample._id + '_' + i,
        toc: action.value,
      },
    );
  }
}

async function addMeasurement(action, options = {}) {
  const ExtendedCommonMeasurement = API.cache('ExtendedCommonMeasurement');
  let selectedMeasurements = API.getData('selectedMeasurements');
  const analysesManager = API.cache('analysesManager');
  let sampleID = options.sampleID || getSampleID(action.value);
  let sampleUUID = options.sampleUUID || getSampleUUID(action.value);
  let measurementUUID =
    options.measurementUUID || getMeasurementUUID(action.value);

  let measurementID = sampleID + ' ' + action.value.__name;
  console.log({ measurementID, measurementUUID });
  let jcamp = '';

  if (action.value.jcamp && action.value.jcamp.filename) {
    jcamp += await API.cache('roc').getAttachment(
      { _id: sampleUUID },
      action.value.jcamp.filename,
    );
  }

  if (!jcamp) {
    // compatibility with old approach
    if (
      action.value.jcampTemperature &&
      action.value.jcampTemperature.filename
    ) {
      jcamp += await API.cache('roc').getAttachment(
        { _id: sampleUUID },
        action.value.jcampTemperature.filename,
      );
    }

    if (action.value.jcampTime && action.value.jcampTime.filename) {
      jcamp +=
        '\n' +
        (await API.cache('roc').getAttachment(
          { _id: sampleUUID },
          action.value.jcampTime.filename,
        ));
    }
  }

  if (jcamp) {
    let measurement = ExtendedCommonMeasurement.fromJcamp(jcamp, {
      id: measurementUUID,
      label: measurementID,
    });

    analysesManager.addAnalysis(measurement);

    let index = analysesManager.getAnalysisIndex(measurementUUID);
    selectedMeasurements[index] = {
      id: measurementUUID,
      code: sampleID,
      label: measurementID,
      index: action.value.__name + '',
      measurement: JSON.parse(JSON.stringify(action.value)),
      color: colors[index % nbColors],
      display: true,
      toc: JSON.parse(
        JSON.stringify(options.toc || API.getData('currentSampleTOCLookup')),
      ),
    };
    return measurement;
  }
}

function updateDistinctLabelUnits() {
  const analysesManager = API.cache('analysesManager');
  API.createData('distinctLabelUnits', analysesManager.getDistinctLabelUnits());
}

function getSampleUUID(entry) {
  while ((entry = entry.__parent)) {
    if (entry._id) return entry._id;
    if (entry.value && entry.value._id) return entry.value._id;
  }
  return '';
}

function getMeasurementUUID(entry) {
  return getSampleUUID(entry) + '_' + entry.__name;
}

function showAllMeasurements() {
  let selectedMeasurements = API.getData('selectedMeasurements');
  for (let measurement of selectedMeasurements) {
    measurement.display = true;
  }
  API.getData('selectedMeasurements').triggerChange();
}

function hideAllMeasurements() {
  let selectedMeasurements = API.getData('selectedMeasurements');
  for (let measurement of selectedMeasurements) {
    measurement.display = false;
  }
  API.getData('selectedMeasurements').triggerChange();
}

function removeAllMeasurements() {
  const analysesManager = API.cache('analysesManager');
  analysesManager.removeAllAnalyses();
  let selectedMeasurements = API.getData('selectedMeasurements');
  selectedMeasurements.length = 0;
  selectedMeasurements.triggerChange();
}

function removeMeasurement(action) {
  const analysesManager = API.cache('analysesManager');
  const selectedMeasurements = API.getData('selectedMeasurements');
  let measurementUUID = String(action.value.id);
  analysesManager.removeAnalysis(measurementUUID);
  for (let i = 0; i < selectedMeasurements.length; i++) {
    if (String(selectedMeasurements[i].id) === measurementUUID) {
      selectedMeasurements.splice(i, 1);
      break;
    }
  }
  selectedMeasurements.triggerChange();
}

function showMeasurements() {
  let selectedMeasurements = API.getData('selectedMeasurements');
  let currentlySelectedMeasurements = API.getData(
    'currentlySelectedMeasurements',
  );
  for (let currentlySelectedMeasurement of currentlySelectedMeasurements) {
    let measurement = selectedMeasurements.filter(
      (measurement) =>
        String(measurement.id) === String(currentlySelectedMeasurement.id),
    )[0];
    measurement.display = true;
  }
  API.getData('selectedMeasurements').triggerChange();
}

function showOnlyMeasurements() {
  let selectedMeasurements = API.getData('selectedMeasurements');
  if (!Array.isArray(selectedMeasurements)) return;
  for (let measurement of selectedMeasurements) {
    measurement.display = false;
  }
  let currentlySelectedMeasurements = API.getData(
    'currentlySelectedMeasurements',
  );
  for (let currentlySelectedMeasurement of currentlySelectedMeasurements) {
    let measurement = selectedMeasurements.filter(
      (measurement) =>
        String(measurement.id) === String(currentlySelectedMeasurement.id),
    )[0];
    measurement.display = true;
  }
  API.getData('selectedMeasurements').triggerChange();
}

function hideMeasurements() {
  let selectedMeasurements = API.getData('selectedMeasurements');
  let currentlySelectedMeasurements = API.getData(
    'currentlySelectedMeasurements',
  );
  for (let currentlySelectedMeasurement of currentlySelectedMeasurements) {
    let measurement = selectedMeasurements.filter(
      (measurement) =>
        String(measurement.id) === String(currentlySelectedMeasurement.id),
    )[0];
    measurement.display = false;
  }
  API.getData('selectedMeasurements').triggerChange();
}

module.exports = processActions;
