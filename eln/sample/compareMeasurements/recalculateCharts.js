import API from 'src/util/api';
import UI from 'src/util/ui';

export default function recalculateCharts() {
  const ExtendedCommonMeasurement = API.cache('ExtendedCommonMeasurement');
  const analysesManager = API.cache('analysesManager');
  const selectedMeasurements = API.getData('selectedMeasurements');
  const preferences = JSON.parse(JSON.stringify(API.getData('preferences')));

  let ids = selectedMeasurements
    .filter((entry) => DataObject.resurrect(entry.display))
    .map((entry) => String(entry.id));
  let colors = selectedMeasurements
    .filter((entry) => DataObject.resurrect(entry.display))
    .map((entry) => String(entry.color));

  let analyses = analysesManager.getAnalyses({ ids });

  console.log('Calculate chart');
  try {
    if (preferences.normalization.processing) {
      let chartProcessed = ExtendedCommonMeasurement.JSGraph.getJSGraph(
        analyses,
        {
          colors,
          opacities: [0.2],
          linesWidth: [3],
          ids,
          selector: preferences.selector,
          normalization: {
            processing: preferences.normalization.processing,
            filters: [
              {
                name: 'rescale',
              },
            ],
          },
        },
      );
      delete preferences.normalization.processing;
      API.createData('chartProcessed', chartProcessed);
    } else {
      API.createData('chartProcessed', {});
    }
  } catch (e) {
    UI.showNotification(
      'There was an error during processing. Adding the filter growingX could help',
    );
    UI.showNotification(e.toString());
  }

  let chart = ExtendedCommonMeasurement.JSGraph.getJSGraph(analyses, {
    colors,
    ids,
    selector: preferences.selector,
    normalization: preferences.normalization,
  });

  API.createData('chart', chart);

  let filterAnnotations =
    ExtendedCommonMeasurement.JSGraph.getNormalizationAnnotations(
      preferences.normalization,
      {
        y: { min: '0px', max: '2000px' },
      },
    );

  API.createData('filterAnnotations', filterAnnotations);
}
