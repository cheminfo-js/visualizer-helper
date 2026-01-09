define(['src/util/api'], (API) => {
  async function track(localName, defaultValue, options = {}) {
    let varName = options.varName || localName;
    let annotationName = `${varName}Annotations`;
    let localValue = [];
    try {
      localValue = JSON.parse(window.localStorage.getItem(localName)) || [];
      if (!Array.isArray(localValue)) {
        throw new Error('TrackRanges expected an array in local storage');
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return API.createData(varName, localValue).then((data) => {
      createAnnotations(data, annotationName);
      data.onChange(() => {
        ensureHighlight(data);
        createAnnotations(data, annotationName);
        localStorage.setItem(localName, JSON.stringify(data));
      });
      return data;
    });
  }

  return track;

  function ensureHighlight(data) {
    let shouldUpdate = false;
    for (let datum of data) {
      if (!datum._highlight) {
        shouldUpdate = true;
        datum._highlight = Math.random();
      }
    }
    if (shouldUpdate) data.triggerChange();
  }

  function createAnnotations(data, annotationName) {
    let annotations = [];
    data = data.resurrect();
    for (let datum of data) {
      let color = 'red';
      if (!datum.active) color = 'pink';
      annotations.push({
        position: [
          {
            x: datum.from,
            y: 0,
            dy: '2px',
          },
          {
            x: datum.to,
            y: 0,
            dy: '-2px',
          },
        ],
        type: 'rect',
        fillColor: color,
        strokeColor: color,
        _highlight: datum._highlight,
        info: datum,
      });
    }
    API.createData(annotationName, annotations);
  }
});
