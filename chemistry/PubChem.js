import ui from 'src/util/ui';

const pubchemURL = 'https://octochemdb.cheminfo.org/compounds/v1/fromMF?';

async function getMolecules(mf) {
  const searchParams = new URLSearchParams();
  searchParams.set('mf', mf);
  searchParams.set('fields', 'data.iupac,data.ocl');
  searchParams.set('limit', '50000');

  let response = await fetch(`${pubchemURL}${  searchParams.toString()}`);
  let results = await response.json();
  console.log(results.data);
  return results.data;
}

module.exports = {
  choose (mf) {
    let promise = getMolecules(mf);
    return ui
      .choose([{ promise }], {
        autoSelect: false,
        asynchronous: true,
        noConfirmation: true,
        returnRow: false,
        dialog: {
          width: 1000,
          height: 800,
        },
        columns: [
          {
            id: 'iupac',
            name: 'Name',
            jpath: [],
            rendererOptions: {
              forceType: 'object',
              twig: `
                {{data.iupac}}
              `,
            },
          },
          {
            id: 'structure',
            name: 'Structure',
            jpath: ['data', 'ocl', 'idCode'],
            rendererOptions: {
              forceType: 'oclID',
            },
            maxWidth: 500,
          },
          {
            id: 'url',
            name: 'Pubchem',
            jpath: [],
            rendererOptions: {
              forceType: 'object',
              twig: `
                <a href="https://pubchem.ncbi.nlm.nih.gov/compound/{{_id}}" onclick="event.stopPropagation()" target="_blank">&#x2B08;</a>
              `,
            },
            maxWidth: 70,
          },
        ],
        idField: 'id',
        slick: {
          rowHeight: 140,
        },
      })
      .catch(function (e) {
        console.error(e); // eslint-disable-line no-console
        ui.showNotification('search failed', 'error');
      });
  },
};
