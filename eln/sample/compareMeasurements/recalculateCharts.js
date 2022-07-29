import API from 'src/util/api';
import UI from 'src/util/ui';

export default function recalculateCharts() {
  const ExtendedCommonMeasurement = API.cache('ExtendedCommonMeasurement');
  const analysesManager = API.cache('analysesManager');
  const selectedMeasurements = API.getData('selectedMeasurements');
  const preferences = JSON.parse(JSON.stringify(API.getData('preferences')));

  console.log(preferences);
  if (preferences.selector && preferences.selector.yLabels) {
    //escape regexp
    preferences.selector.yLabel =
      '/' +
      preferences.selector.yLabels
        .map((label) => label.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
        .join('|') +
      '/i';
    delete preferences.selector.labels;
  }
  console.log(preferences.selector.yLabel);

  let ids = selectedMeasurements
    .filter((entry) => DataObject.resurrect(entry.display))
    .map((entry) => String(entry.id));
  let colors = selectedMeasurements
    .filter((entry) => DataObject.resurrect(entry.display))
    .map((entry) => String(entry.color));

  let analyses = analysesManager.getAnalyses({ ids });

  console.log(preferences);
  debugger;
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
