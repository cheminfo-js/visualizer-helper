import OCL from 'openchemlib';

// returns GHS information based on pubchem and a smiles

define(['src/util/ui'], (UI) => {
  async function fromIDCode(oclCode, options) {
    const molecule = OCL.Molecule.fromIDCode(oclCode);
    const smiles = molecule.toSmiles();
    return fromSMILES(smiles, options);
  }

  async function fromSMILES(smiles) {
    const html = `<iframe src="https://www.lactame.com/react/views/v1.2.1/chemistry/pubchem.html?smiles=${encodeURIComponent(
      smiles,
    )}" frameborder="0" style="overflow:hidden;height:95%;width:100%" height="95%" width="100%"></iframe>`;

    UI.dialog(html, {
      width: 1000,
      height: 800,
      modal: true,
      title: 'Pubchem information',
    });
  }

  return { fromIDCode, fromSMILES };
});
