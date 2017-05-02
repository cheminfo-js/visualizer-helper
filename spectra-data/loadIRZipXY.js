'use strict';

async function loadZips(zipURLs, options = {}) {
    const JSZip = await API.require('jszip');
    const superagent = await API.require('superagent');
    const xyParser = await API.require('https://www.lactame.com/lib/xy-parser/1.3.0/xy-parser.min.js');
    var jszip = new JSZip();
    var spectraDataSet = [];
    for (let zipURL of zipURLs) {
        let zipFiles = await superagent.get(zipURL, {responseType: 'arraybuffer'})
            .withCredentials()
            .responseType('blob');
        var zip = await jszip.loadAsync(zipFiles.body);
        let filesToProcess = Object.keys(zip.files).filter( filename => filename.match(/\.[0-9]+$/));
        for (const filename of filesToProcess) {
            let fileData=await zip.files[filename].async('string');
            let result = xyParser(fileData, {arrayType: 'xxyy'});
            let spectrum = SD.NMR.fromXY(result[0], result[1], {
                dataType: 'IR',
                xUnit: 'waveNumber',
                yUnit: ''
            });
            if (options.filter) options.filter(spectrum.sd);
            spectrum.sd.info = {};
            spectrum.sd.filename = filename;
            spectraDataSet.push(spectrum);
        }
    }
    return spectraDataSet;
}

