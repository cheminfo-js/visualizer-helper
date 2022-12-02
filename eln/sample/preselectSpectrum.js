import API from 'src/util/api';

/*
 Need to be able to select a spectrum when loading the page.
 We receive an event that contains spectrumID
 
 In General preference we add:
 
if (data.message.spectrumID) {
    preselectSpectrum('ir', data.message.spectrumID);
}

We need to find out when the module containing the spectra is loaded before sending the event

We create a global action in the General preferences called `SpectraListLoaded`

API.cache('SpectraListLoaded', true);
 
We add in the module that contains the list of spectra an action out with 'onLoaded': 'SpectraListLoaded'
 
 
*/

module.exports = function preselectSpectrum(kind, spectrumID) {
  setTimeout(() => {
    const spectra = API.getData(kind);
    console.log({ kind, spectrumID });
    if (spectra && API.cache('SpectraListLoaded')) {
      const toSelect = findSpectrum(spectra, spectrumID);
      API.doAction('SelectSpectrum', toSelect);
      return;
    }
    preselectSpectrum(kind, spectrumID);
  }, 500);
};

function findSpectrum(spectra, spectrumID) {
  spectra = spectra.resurrect();
  for (let i = 0; i < spectra.length; i++) {
    const spectrum = spectra[i];
    if (spectrum.reference === spectrumID) return i;
    if (spectrum.jcamp && spectrum.jcamp.filename === spectrumID) return i;
    if (spectrum.netcdf && spectrum.netcdf.filename === spectrumID) return i;
    if (spectrum.xml && spectrum.xml.filename === spectrumID) return i;
  }
}
