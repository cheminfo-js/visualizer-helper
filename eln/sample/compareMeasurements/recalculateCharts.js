import API from 'src/util/api';
import UI from 'src/util/ui';

export default function recalculateCharts() {
  const ExtendedCommonMeasurement = API.cache('ExtendedCommonMeasurement');
  const analysesManager = API.cache('analysesManager');
  const selectedMeasurements = API.getData('selectedMeasurements');
  const preferences = JSON.parse(JSON.stringify(API.getData('preferences')));

  if (
    preferences.selector &&
    preferences.selector.y &&
    preferences.selector.y.labels
  ) {
    //escape regexp
    preferences.selector.y.label =
      '/' +
      preferences.selector.y.labels
        .map((label) => label.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
        .join('|') +
      '/i';
    delete preferences.selector.y.labels;
  }

  let ids = selectedMeasurements
    .filter((entry) => DataObject.resurrect(entry.display))
    .map((entry) => String(entry.id));
  let colors =
    selectedMeasurements.length > 1
      ? selectedMeasurements
          .filter((entry) => DataObject.resurrect(entry.display))
          .map((entry) => String(entry.color))
      : undefined;

  let analyses = analysesManager.getAnalyses({ ids });

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
