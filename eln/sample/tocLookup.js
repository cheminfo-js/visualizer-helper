import ui from 'src/util/ui';

module.exports = {
  choose(entries, options) {
    entries = JSON.parse(JSON.stringify(entries));
    entries.forEach((entry) => {
      entry.names = entry.value.names.join('<br />');
    });

    return ui
      .choose(entries, {
        autoSelect: options.autoSelect,
        noConfirmation: true,
        returnRow: true,
        dialog: {
          width: 1000,
          height: 800,
        },
        columns: [
          {
            id: 'code',
            name: 'Code',
            jpath: ['key', '0'],
            maxWidth: 100,
          },
          {
            id: 'batch',
            name: 'Batch',
            jpath: ['key', '1'],
            maxWidth: 100,
          },
          {
            id: 'names',
            name: 'names',
            jpath: ['names'],
            rendererOptions: {
              forceType: 'html',
            },
          },

          {
            id: 'molfile',
            name: 'Molecule',
            jpath: ['value', 'ocl'],
            rendererOptions: {
              forceType: 'oclid',
            },
            maxWidth: 400,
          },
        ],
        idField: 'id',
        slick: {
          rowHeight: 150,
        },
      })
      .catch((err) => {
        reportError(err);
        ui.showNotification('search failed', 'error');
      });
  },
};
