import API from 'src/util/api';
import UI from 'src/util/ui';

async function spectraInDatasetModifications() {
  const spectraProcessor = API.cache('spectraProcessor');
  const roc = API.cache('roc');
  const spectraInDataset = API.getData('spectraInDataset');
  const preferences = JSON.parse(JSON.stringify(API.getData('preferences')));

  let currentIDs = spectraInDataset.map((spectrum) => String(spectrum.id));
  spectraProcessor.removeSpectraNotIn(currentIDs);

  try {
    spectraProcessor.setNormalization(preferences.normalization);
  } catch (e) {
    UI.showNotification(e);
    return;
  }

  let promises = [];
  for (let i = 0; i < spectraInDataset.length; i++) {
    const spectrum = spectraInDataset[i];
    let id = String(spectrum.id);
    if (spectraProcessor.contains(id)) {
      let processorSpectrum = spectraProcessor.getSpectrum(id);
      processorSpectrum.meta.color = DataObject.resurrect(spectrum.color);
      processorSpectrum.meta.selected = DataObject.resurrect(spectrum.selected);
      processorSpectrum.meta.category = DataObject.resurrect(spectrum.category);
      continue;
    }
    if (spectrum.jcamp) {
      if (spectrum.jcamp.data && spectrum.jcamp.data.value) {
        // we have already the data we can use it and delete it at the end
        try {
          spectraProcessor.addFromJcamp(spectrum.jcamp.data.value, {
            id,
            meta: {
              info: DataObject.resurrect(spectrum.toc),
              color: DataObject.resurrect(spectrum.color),
              selected: DataObject.resurrect(spectrum.selected),
              category: DataObject.resurrect(spectrum.category),
            },
          });
        } catch (e) {
          UI.showNotification(e.toString());
        }
        delete spectrum.jcamp.data.value;
      } else {
        promises.push(
          roc
            .getAttachment({ _id: spectrum.sampleID }, spectrum.jcamp.filename)
            .then((jcamp) => {
              // we should check if it is a composed jcamp
              try {
                spectraProcessor.addFromJcamp(jcamp, {
                  id,
                  meta: {
                    info: DataObject.resurrect(spectrum.toc),
                    color: DataObject.resurrect(spectrum.color),
                    selected: DataObject.resurrect(spectrum.selected),
                    category: DataObject.resurrect(spectrum.category),
                  },
                });
              } catch (e) {
                UI.showNotification(e.toString());
              }
            }),
        );
      }
    } else if (spectrum.data) {
      try {
        spectraProcessor.addFromData(DataObject.resurrect(spectrum.data), {
          id,
          meta: {
            ...DataObject.resurrect(spectrum.toc),
            color: DataObject.resurrect(spectrum.color),
            selected: DataObject.resurrect(spectrum.selected),
            category: DataObject.resurrect(spectrum.category),
          },
        });
      } catch (e) {
        UI.showNotification(e.toString());
      }
    }
  }
  if (promises.length) API.createData('chart', {});
  await Promise.all(promises);

  // we need to check if there is a from / to
  const hasFrom = Number.isFinite(preferences.normalization.from);
  const hasTo = Number.isFinite(preferences.normalization.to);
  if (!hasFrom || !hasTo) {
    let prefs = API.getData('preferences');
    let minMaxX = spectraProcessor.getMinMaxX();
    if (minMaxX.min < minMaxX.max) {
      if (!hasFrom) prefs.normalization.from = minMaxX.min;
      if (!hasTo) prefs.normalization.to = minMaxX.max;
      prefs.triggerChange();
    }
  }

  const previousMemoryInfo =
    DataObject.resurrect(API.getData('memoryInfo')) || {};
  let memoryInfo = spectraProcessor.getMemoryInfo();
  if (
    !API.getData('keepOriginal') ||
    memoryInfo.keepOriginal !== previousMemoryInfo.keepOriginal
  ) {
    API.createData('keepOriginal', memoryInfo.keepOriginal);
  }
  API.createData('memoryInfo', memoryInfo);

  // force an update of the chart taking into account the autorefresh
  API.doAction('UpdateChart');
}

module.exports = spectraInDatasetModifications;
