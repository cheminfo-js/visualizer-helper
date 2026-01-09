import API from 'src/util/api';

import load from './load';

module.exports = async function loadTwig(category, options = {}) {
  const { variableName = 'twigTemplate' } = options;

  try {
    let templates = new DataObject(await load(category));
    let twigTemplate = await templates.getChild([
      '0',
      'document',
      '$content',
      'twig',
    ]);
    if (variableName) API.createData(variableName, twigTemplate);
    return twigTemplate;
  } catch (err) {
    reportError(err);
    return '';
  }
};
