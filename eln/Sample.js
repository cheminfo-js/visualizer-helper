import Datas from 'src/main/datas';
import API from 'src/util/api';
import UI from 'src/util/ui';

import Roc from '../rest-on-couch/Roc';

import ExpandableMolecule from './ExpandableMolecule';
import MF from './MF';
import Nmr1dManager from './Nmr1dManager';
import Sequence from './Sequence';
import { createVar } from './jpaths';
import convertToJcamp from './libs/convertToJcamp';
import elnPlugin from './libs/elnPlugin';
import { createTree } from './libs/jcampconverter';

const DataObject = Datas.DataObject;

let defaultOptions = {
  varName: 'sample',
  track: false,
  bindChange: true,
};

class Sample {
  constructor(couchDB, uuid, options = {}) {
    this.isSynced = true;
    this.options = { ...defaultOptions, ...options };

    let roc = API.cache('roc');
    if (!roc) {
      roc = new Roc({
        url: couchDB.url,
        database: couchDB.database,
        processor: elnPlugin,
        kind: couchDB.kind,
      });
      API.cache('roc', roc);
    }
    this.roc = roc;

    let emitter = this.roc.getDocumentEventEmitter(uuid);
    emitter.on('sync', () => {
      this.isSynced = true;
    });
    emitter.on('unsync', () => {
      this.isSynced = false;
    });

    if (options.onSync) {
      emitter.on('sync', () => options.onSync(true));
      emitter.on('unsync', () => options.onSync(false));
    }

    this.uuid = uuid;
    if (!this.uuid) {
      UI.showNotification(
        'Cannot create an editable sample without an uuid',
        'error',
      );
      return;
    }
    this.sample = this.roc
      .document(this.uuid, this.options)
      .then(async (sample) => {
        this.sample = sample;
        this.updateOtherAttachments();
        this._loadInstanceInVisualizer();
      });

    this._checkServerChanges();
  }

  waitSampleLoaded() {
    return this.sample;
  }

  async getToc() {
    // sample_toc is now expected to be based on last modification date
    let id = DataObject.resurrect(this.sample.modificationDate);
    let result = await this.roc.query('sample_toc', {
      key: id,
      filter: (entry) => {
        return entry.id === this.uuid;
      },
    });

    if (result.length === 0) {
      id = DataObject.resurrect(this.sample.$id).join(' ');
      result = await this.roc.query('sample_toc', {
        key: id,
        filter: (entry) => {
          return entry.id === this.uuid;
        },
      });
    }
    if (result.length === 0) {
      result = await this.roc.query('sample_toc', {
        key: id.trimEnd(' '),
        filter: (entry) => {
          return entry.id === this.uuid;
        },
      });
    }
    return result[0];
  }

  _checkServerChanges() {
    window.setInterval(async () => {
      if (this.sample && this.sample._rev) {
        let uuid = this.sample._id;
        let rev = this.sample._rev;
        let headers = await this.roc.getHeader(uuid);
        if (!headers || !headers.etag) return;
        let remoteRev = String(headers.etag).replace(/"/g, '');
        let target = document.getElementById('modules-grid');
        if (remoteRev && rev !== remoteRev && this.options.track) {
          let remoteHasChangedDiv = document.getElementById('remoteHasChanged');
          if (!remoteHasChangedDiv) {
            let alertDiv = document.createElement('DIV');
            alertDiv.innerHTML = `<p id="remoteHasChanged" style="font-weight: bold; color: red; font-size: 3em; background-color: yellow">
This entry has changed on the server, please reload the sample.<br>
Your local changes will be lost.</p>`;

            alertDiv.style.zIndex = 99;
            alertDiv.style.position = 'fixed';

            target.prepend(alertDiv);
          } else {
            remoteHasChangedDiv.style.display = 'block';
          }
          this.remoteChanged = true;
        }
      }
    }, 60 * 1000);
  }

  createVariables() {
    let sampleVar = API.getVar(this.options.varName);
    createVar(sampleVar, 'sampleCode');
    createVar(sampleVar, 'batchCode');
    createVar(sampleVar, 'creationDate');
    createVar(sampleVar, 'modificationDate');
    createVar(sampleVar, 'content');
    createVar(sampleVar, 'general');
    createVar(sampleVar, 'molfile');
    createVar(sampleVar, 'firstPeptide');
    createVar(sampleVar, 'firstNucleotide');
    createVar(sampleVar, 'mf');
    createVar(sampleVar, 'mw');
    createVar(sampleVar, 'em');
    createVar(sampleVar, 'title');
    createVar(sampleVar, 'description');
    createVar(sampleVar, 'keyword');
    createVar(sampleVar, 'meta');
    createVar(sampleVar, 'name');
    createVar(sampleVar, 'physical');
    createVar(sampleVar, 'bp');
    createVar(sampleVar, 'nd');
    createVar(sampleVar, 'mp');
    createVar(sampleVar, 'density');
    createVar(sampleVar, 'stockHistory');
    createVar(sampleVar, 'stock');
    createVar(sampleVar, 'lastStock');
    createVar(sampleVar, 'supplier');
    createVar(sampleVar, 'ir');
    createVar(sampleVar, 'uv');
    createVar(sampleVar, 'raman');
    createVar(sampleVar, 'permeability');
    createVar(sampleVar, 'mass');
    createVar(sampleVar, 'nmr');
    createVar(sampleVar, 'iv');
    createVar(sampleVar, 'xray');
    createVar(sampleVar, 'chromatogram');
    createVar(sampleVar, 'thermogravimetricAnalysis');
    createVar(sampleVar, 'hgPorosimetry');
    createVar(sampleVar, 'differentialCentrifugalSedimentation');
    createVar(sampleVar, 'isotherm');
    createVar(sampleVar, 'pelletHardness');
    createVar(sampleVar, 'oan');
    createVar(sampleVar, 'xrd');
    createVar(sampleVar, 'xrf');
    createVar(sampleVar, 'xps');
    createVar(sampleVar, 'icp');
    createVar(sampleVar, 'dls');
    createVar(sampleVar, 'cyclicVoltammetry');
    createVar(sampleVar, 'elementalAnalysis');
    createVar(sampleVar, 'differentialScanningCalorimetry');
    createVar(sampleVar, 'image');
    createVar(sampleVar, 'video');
    createVar(sampleVar, 'sampleCode');
    createVar(sampleVar, 'attachments');
    createVar(sampleVar, 'nucleic');
    createVar(sampleVar, 'peptidic');
    createVar(sampleVar, 'biology');

    createVar(sampleVar, 'pictogram');
    createVar(sampleVar, 'signalWord');
    createVar(sampleVar, 'hazardStatement');
    createVar(sampleVar, 'precautionaryStatement');
  }

  async _loadInstanceInVisualizer() {
    updateSample(this.sample);

    this.createVariables();

    this._initializeObjects();

    this.onChange = (event) => {
      let jpathStr = event.jpath.join('.');
      if (jpathStr.match(/\$content.spectra.nmr.[0-9]+.range/)) {
        this.nmr1dManager.rangesHasChanged();
      }

      switch (jpathStr) {
        case '$content.general.molfile':
          this.mf.fromMolfile();
          this.nmr1dManager.handleAction({
            name: 'clearAllAssignments',
          });
          break;
        case '$content.general.mf':
          this.mf.fromMF();
          this.nmr1dManager.updateIntegralOptionsFromMF();
          break;
        case '$content.biology':
          break;
        case '$content.general.sequence':
          throw new Error('Trying to change old sequence, this is a bug');

        default:
          break; // ignore
      }
    };

    this.bindChange();
  }

  updateOtherAttachments() {
    let otherAttachments = this.sample.attachmentList.filter(
      (entry) => !entry.name.includes('/'),
    );
    API.createData('otherAttachments', otherAttachments);
  }

  _initializeObjects() {
    this.expandableMolecule = new ExpandableMolecule(this.sample, this.options);
    this.nmr1dManager = new Nmr1dManager(this.sample);

    this.mf = new MF(this.sample);
    this.mf.fromMF();
  }

  bindChange() {
    if (this.options.bindChange) {
      this.sample.unbindChange(this.onChange);
      this.sample.onChange(this.onChange);
    }
  }

  unbindChange() {
    if (this.options.bindChange) this.sample.unbindChange(this.onChange);
  }

  /** An image with a special name that is used to display on the
   * first page of a sample
   */
  async handleOverview(variableName) {
    let data = API.getData(variableName);
    if (data && data.file && data.file[0]) {
      let file = data.file[0];
      // we only accepts 3 mimetype
      switch (file.mimetype) {
        case 'image/png':
          file.filename = 'overview.png';
          break;
        case 'image/jpeg':
          file.filename = 'overview.jpg';
          break;
        case 'image/svg+xml':
          file.filename = 'overview.svg';
          break;
        default:
          UI.showNotification(
            'For overview only the following formats are allowed: png, jpg and svg.',
            'error',
          );
          return undefined;
      }
      return this.handleDrop(variableName, false);
    }
    return undefined;
  }

  /**
   *
   * @param {string} variableName
   * @param {boolean} askType
   * @param {object} options
   * @param {string} [options.customMetadata]
   * @param {boolean} [options.autoJcamp] - converts automatically tsv, txt and csv to jcamp
   * @param {boolean} [options.converters] - callback to convert some files based on their kind (extension)
   * @param {boolean} [options.autoKind] - callback to determine automatically kind
   */
  async handleDrop(variableName, askType, options = {}) {
    let { converters, autoJcamp, autoKind } = options;
    let type;
    if (!variableName) {
      throw new Error('handleDrop expects a variable name');
    }
    variableName = String(variableName);
    if (!askType) {
      // maps name of variable to type of data
      const types = {
        droppedNmr: 'nmr',
        droppedIR: 'ir',
        droppedUV: 'uv',
        droppedIV: 'iv',
        droppedMS: 'mass',
        droppedRaman: 'raman',
        droppedPermeability: 'permeability',
        droppedChrom: 'chromatogram',
        droppedCV: 'cyclicVoltammetry',
        droppedTGA: 'thermogravimetricAnalysis',
        droppedIsotherm: 'isotherm',
        droppedDSC: 'differentialScanningCalorimetry',
        droppedHg: 'hgPorosimetry',
        droppedPelletHardness: 'pelletHardness',
        droppedOAN: 'oan',
        droppedDCS: 'differentialCentrifugalSedimentation',
        droppedXray: 'xray',
        droppedXRD: 'xrd',
        droppedXRF: 'xrf',
        droppedXPS: 'xps',
        droppedOverview: 'image',
        droppedImage: 'image',
        droppedVideo: 'video',
        droppedGenbank: 'genbank',
        droppedOther: 'other',
      };
      if (!types[variableName]) {
        throw new Error('Unexpected variable name');
      }
      type = types[variableName];
    } else {
      type = await UI.choose(
        {
          nmr: 'NMR (csv, tsv, txt, jcamp, pdf)',
          mass: 'Mass (csv, tsv, txt, jcamp, pdf, netcdf, xml)',
          ir: 'Infrared (csv, tsv, txt, jcamp, pdf)',
          raman: 'Raman (csv, tsv, txt, jcamp, pdf)',
          permeability: 'Permeability (csv, tsv, txt, jcamp, pdf)',
          uv: 'UV (csv, tsv, txt, jcamp, pdf)',
          iv: 'IV (csv, tsv, txt, jcamp, pdf)',
          chromatogram:
            'Chromatogram LC, GC, LC/MS, GC/MS (csv, tsv, txt, jcamp, pdf, netcdf, xml)',
          thermogravimetricAnalysis:
            'Thermogravimetric Analysis (csv, tsv, txt, jcamp)',
          xrd: 'Powder XRD Analysis (csv, tsv, txt, jcamp)',
          xrf: 'Xray fluorescence (csv, tsv, txt, jcamp)',
          xps: 'XPS (csv, tsv, txt, jcamp)',
          differentialCentrifugalSedimentation:
            'Differential Centrifugal Sedimentation (csv, tsv, txt, jcamp)',
          hgPorosimetry: 'Hg porosimetry (csv, tsv, txt, jcamp)',
          isotherm: 'Isotherm (csv, tsv, txt, jcamp, xls)',
          cyclicVoltammetry: 'Cyclic voltammetry (csv, tsv, txt, jcamp, pdf)',
          differentialScanningCalorimetry:
            'Differential Scanning Calorimetry (csv, tsv, txt, jcamp)',
          dls: 'Dynamic light scattering Analysis (csv, tsv, txt, jcamp)',
          xray: 'Crystal structure (cif, pdb)',
          image: 'Images (jpg, png or tiff)',
          video: 'Videos (mp4, m4a, avi, wav)',
          other: 'Other',
        },
        {
          noConfirmation: true,
          columns: [
            {
              id: 'description',
              name: 'description',
              field: 'description',
            },
          ],
        },
      );
      if (!type) return;
    }

    // Dropped data can be an array
    // Expecting format as from drag and drop module
    let droppedDatas = API.getData(variableName);
    droppedDatas = droppedDatas.file || droppedDatas.str;
    if (converters) {
      // a converter may generate many results
      const newData = [];
      for (let droppedData of droppedDatas) {
        if (!droppedData.filename.includes('.')) {
          droppedData.filename += '.txt';
        }
        const extension = droppedData.filename
          .replace(/.*\./, '')
          .toLowerCase();
        let kind = extension;
        if (autoKind) {
          kind = autoKind(droppedData) || kind;
        }
        if (converters[kind]) {
          autoJcamp = false;

          let converted = await converters[kind](
            droppedData.content,
            droppedData,
          );
          if (!Array.isArray(converted)) {
            converted = [converted];
          }
          for (let i = 0; i < converted.length; i++) {
            if (typeof converted[i] === 'string') {
              const extend = i > 0 ? `_${i + 1}` : '';
              newData.push({
                filename: droppedData.filename.replace(
                  /\.[^.]*$/,
                  `${extend}.jdx`,
                ),
                mimetype: 'chemical/x-jcamp-dx',
                contentType: 'chemical/x-jcamp-dx',
                encoding: 'utf8',
                content: converted[i],
              });
            } else {
              newData.push({ ...converted[i] });
            }
          }
          droppedData.converted = true;
        }
      }
      droppedDatas = droppedDatas
        .filter((droppedData) => !droppedData.converted)
        .concat(newData);
    }

    /*
      Possible autoconvertion of text file to jcamp
      * if filename ends with TXT, TSV or CSV
      * use convert-to-jcamp
    */
    if (autoJcamp) {
      const jcampTypes = {
        nmr: {
          type: 'NMR SPECTRUM',
          xUnit: 'Delta [ppm]',
          yUnit: 'Relative',
        },
        ir: {
          type: 'IR SPECTRUM',
          xUnit: 'Wavenumber [cm-1]',
          yUnit: ['Transmittance (%)', 'Absorbance'],
        },
        raman: {
          type: 'RAMAN SPECTRUM',
          xUnit: 'Wavenumber [cm-1]',
          yUnit: 'Absorbance',
        },
        permeability: {
          type: 'PERMEABILITY MEASUREMENT',
          xUnit: 'Wavenumber [cm-1]',
          yUnit: 'Absorbance',
        },
        iv: {
          type: 'IV SPECTRUM',
          xUnit: [
            'Potential vs Fc/Fc+ [V]',
            'Potential vs Ag/AgNO3 [V]',
            'Potential vs Ag/AgCl/KCl [V]',
            'Potential vs Ag/AgCl/NaCl [V]',
            'Potential vs SCE [V]',
            'Potential vs NHE [V]',
            'Potential vs SSCE [V]',
            'Potential vs Hg/Hg2SO4/K2SO4 [V]',
          ],
          yUnit: ['Current [mA]', 'Current [µA]'],
        },
        uv: {
          type: 'UV SPECTRUM',
          xUnit: 'wavelength [nm]',
          yUnit: 'Absorbance',
        },
        mass: {
          type: 'MASS SPECTRUM',
          xUnit: 'm/z [Da]',
          yUnit: 'Relative',
        },
        cyclicVoltammetry: {
          type: 'Cyclic voltammetry',
          xUnit: 'Ewe [V]',
          yUnit: 'I [mA]',
        },
        thermogravimetricAnalysis: {
          type: 'Thermogravimetric analysis',
          xUnit: 'Temperature [°C]',
          yUnit: 'Weight [mg]',
        },
        hgPorosimetry: {
          type: 'Hg porosimetry',
          xUnit: 'Pressure [MPa]',
          yUnit: 'Volume [mm³/g]',
        },
        differentialCentrifugalSedimentation: {
          type: 'Differential Centrifugal Sedimentation',
          xUnit: 'Diameter [nm]',
          yUnit: 'Quantity',
        },
        differentialScanningCalorimetry: {
          type: 'Differentical scanning calorimetry',
          xUnit: 'I [mA]',
          yUnit: 'Ewe [V]',
        },
        isotherm: {
          type: 'Isotherm',
          xUnit: ['p/p0', 'p / kPa'],
          yUnit: ['excess adsorption mmol/g', 'adsorbed volume cm3/g'],
        },
        xrd: {
          type: 'X-ray powder diffraction',
          xUnit: '2ϴ [°]',
          yUnit: 'counts',
        },
        xrf: {
          type: 'X-ray fluoresence',
          xUnit: 'Energy [keV]',
          yUnit: 'Intensity',
        },
        chromatogram: {
          type: 'Chromatography',
          xUnit: 'Time [min]',
          yUnit: 'Intensity',
        },
      };

      for (let droppedData of droppedDatas) {
        if (!droppedData.filename.includes('.')) droppedData.filename += '.txt';
        let extension = droppedData.filename.replace(/.*\./, '').toLowerCase();
        if (extension === 'txt' || extension === 'csv' || extension === 'tsv') {
          let info = jcampTypes[type];
          if (info) {
            info.filename = `${droppedData.filename.replace(
              /\.[^.]*$/,
              '',
            )}.jdx`;
            // we will ask for meta information
            let meta = await UI.form(
              `
              <style>
                  #jcamp {
                      zoom: 1.5;
                  }
              </style>
              <div id='jcamp'>
                  <b>Automatic conversion of text file to jcamp</b>
                  <form>
                  <table>
                  <tr>
                    <th>Kind</th>
                    <td><input type="text" name="type" value="${
                      info.type
                    }"></td>
                  </tr>
                  <tr>
                    <th>Filename (ending with .jdx)</th>
                    <td><input type="text" pattern=".*\\.jdx$" name="filename" size=40 value="${
                      info.filename
                    }"></td>
                  </tr>
                  <tr>
                    <th>xUnit (horizon axis)</th>
                    ${
                      info.xUnit instanceof Array
                        ? `<td><select name="xUnit">${info.xUnit.map(
                            (xUnit) =>
                              `<option value="${xUnit}">${xUnit}</option>`,
                          )}</select></td>`
                        : `<td><input type="text" name="xUnit" value="${info.xUnit}"></td>`
                    }
                  </tr>
                  <tr>
                  <th>yUnit (vectical axis)</th>
                  ${
                    info.yUnit instanceof Array
                      ? `<td><select name="yUnit">${info.yUnit.map(
                          (yUnit) =>
                            `<option value="${yUnit}">${yUnit}</option>`,
                        )}</select></td>`
                      : `<td><input type="text" name="yUnit" value="${info.yUnit}"></td>`
                  }
                </tr>
                  </table>
                    <input type="submit" value="Submit"/>
                  </form>
              </div>
            `,
              {},
              {
                dialog: {
                  width: 600,
                },
              },
            );
            if (!meta) return;

            droppedData.filename = `${meta.filename}`;
            droppedData.mimetype = 'chemical/x-jcamp-dx';
            droppedData.contentType = 'chemical/x-jcamp-dx';
            let content = droppedData.content;
            switch (droppedData.encoding) {
              case 'base64':
                content = atob(droppedData.content);
                droppedData.encoding = 'text';
                break;
              case 'buffer':
                const decoder = new TextDecoder();
                content = decoder.decode(droppedData.content);
                droppedData.encoding = 'text';
                break;
            }
            droppedData.content = convertToJcamp(content, {
              meta,
            });
          } else {
            // eslint-disable-next-line no-console
            console.log('Could not convert to jcamp file: ', type);
          }
        }
      }
    }
    if (type === 'other') {
      await this.roc.addAttachment(this.sample, droppedDatas);
      this.updateOtherAttachments();
    } else {
      await this.attachFiles(droppedDatas, type, options);
    }
  }

  async handleAction(action) {
    if (!action) return;

    if (
      this.expandableMolecule &&
      this.expandableMolecule.handleAction(action)
    ) {
      return;
    }
    if (this.nmr1dManager && this.nmr1dManager.handleAction(action)) return;
    switch (action.name) {
      case 'save':
        await this.roc.update(this.sample);
        break;
      case 'explodeSequences':
        Sequence.explodeSequences(this.sample);
        break;
      case 'pasteAnalysis':
        await pasteAnalysis(this);
        break;
      case 'copyAnalysis':
        await copyAnalysis(this.sample, action.value);
        break;
      case 'calculateMFFromSequence':
        Sequence.calculateMFFromSequence(this.sample);
        break;
      case 'calculateMFFromPeptidic':
        Sequence.calculateMFFromPeptidic(this.sample);
        break;
      case 'calculateMFFromNucleic':
        Sequence.calculateMFFromNucleic(this.sample);
        break;
      case 'translateNucleic':
        Sequence.translateNucleic(this.sample);
        break;
      case 'createOptions':
        var advancedOptions1H = API.cache('nmr1hAdvancedOptions');
        if (advancedOptions1H) {
          API.createData(
            'nmr1hOndeTemplate',
            API.cache('nmr1hOndeTemplates').full,
          );
        } else {
          API.createData(
            'nmr1hOndeTemplate',
            API.cache('nmr1hOndeTemplates').short,
          );
        }
        break;
      case 'recreateVariables':
        this.createVariables();
      case 'deleteAttachment':
        const ok = await UI.confirm(
          'Are you sure you want to delete the attachment?',
        );
        if (!ok) return;
        const attachment = action.value.name;
        await this.roc.deleteAttachment(this.sample, attachment);
        this.updateOtherAttachments();
        break;
      case 'deleteNmr': // Deprecated. Use unattach. Leave this for backward compatibility
      case 'unattach':
        if (
          await UI.confirm('Are you sure you want to delete the analysis ?')
        ) {
          await this.roc.unattach(this.sample, action.value);
        }
        break;
      case 'attachNMR':
      case 'attachIR':
      case 'attachRaman':
      case 'attachPermeability':
      case 'attachMass': {
        let tempType = action.name.replace('attach', '');
        let type = tempType.charAt(0).toLowerCase() + tempType.slice(1);
        let droppedDatas = action.value;
        droppedDatas = droppedDatas.file || droppedDatas.str;
        await this.attachFiles(droppedDatas, type);
        break;
      }
      case 'refresh': {
        const { value = {} } = action;
        if (!value.noConfirmation) {
          const ok = await UI.confirm(
            'Are you sure you want to refresh? This will discard your local modifications.',
          );
          if (!ok) return;
        }

        this.expandableMolecule.unbindChange();
        await this.roc.discardLocal(this.sample);
        this._initializeObjects();
        this.bindChange();
        this.remoteChanged = false;
        let remoteHasChangedDiv = document.getElementById('remoteHasChanged');
        if (remoteHasChangedDiv) {
          remoteHasChangedDiv.style.display = 'none';
        }
        this.nmr1dManager.handleAction({ name: 'nmrChanged' });
        break;
      }
      default:
        break;
    }
  }

  // if we programmatically change the sample especially the molfile
  // we need to call this method
  refresh() {
    this.expandableMolecule.unbindChange();
    this._initializeObjects();
    this.bindChange();
  }

  async attachFiles(files, type, options) {
    if (!files || !type) return;
    if (!Array.isArray(files)) {
      files = [files];
    }

    if (type === 'nmr') {
      const newFiles = [];
      // we need some hacks for composite JCAMP-DX files to keep only NMR spectrum and no FID
      for (const file of files) {
        if (file.filename.match(/\.(jdx|dx)$/i)) {
          const tree = createTree(file.content, { flatten: true }).filter(
            (spectrum) =>
              spectrum.dataType &&
              spectrum.dataType
                .toUpperCase()
                .replaceAll(' ', '')
                .match(/NMRSPECTRUM/i),
          );
          for (const entry of tree) {
            newFiles.push({
              content: entry.jcamp,
              contentType: file.contentType,
              filename: file.filename.replace(/fid.jdx/i, 'jdx'),
              mimetype: file.mimetype,
              encoding: 'text',
            });
          }
        } else {
          newFiles.push(file);
        }
      }
      files = newFiles;
    }

    for (let i = 0; i < files.length; i++) {
      const data = DataObject.resurrect(files[i]);
      await this.roc.attach(type, this.sample, data, options);
    }
  }
}

async function pasteAnalysis(sample) {
  // need to check that the sample is sync otherwise no save !!!
  if (!sample.isSynced) {
    UI.dialog(
      'The sample is currently being edited. Please save it first.',
      'error',
    );
    return;
  }

  let pasted;
  try {
    const clipboard = await navigator.clipboard.readText();
    pasted = JSON.parse(clipboard);
    if (!pasted || pasted.type !== '11871ff4-e464-11ef-b4ba-7e5598b597fb') {
      UI.dialog(
        'You first need to copy an analysis from another sample by clicking on the copy icon present on the analysis line.',
      );
      return;
    }
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      UI.showNotification(
        'Clipboard access denied, please try to paste again',
        'warning',
      );
    } else {
      UI.dialog(e.toString());
    }
    return;
  }
  if (sample.sample._id === pasted.data._parentID) {
    UI.dialog('You can not paste an analysis from the same sample', 'error');
    return;
  }

  const existingAttachments = sample.sample._attachments || {};

  const { data, jpath } = structuredClone(pasted);
  const newAttachments = [];

  for (const key in data) {
    if (typeof data[key] === 'object' && data[key]._source) {
      const source = data[key]._source;
      delete data[key]._source;
      // we need to load the files from dURL
      const response = await fetch(source.dUrl, { credentials: 'include' });

      const filename = getName(existingAttachments, data[key].filename);
      data[key].filename = filename;
      existingAttachments[filename] = {};
      newAttachments.push({
        content: await response.arrayBuffer(),
        filename,
        contentType: source.content_type,
        mimetype: source.content_type,
        encoding: 'buffer',
      });
    }
  }

  // where should I add the entry in the right table
  const target = sample.sample.getChildSync(['$content', ...jpath]);
  target.push(data);

  // time to save all the new attachments
  if (newAttachments.length > 0) {
    await sample.roc.addAttachment(sample.sample, newAttachments, {});
  }
  await sample.roc.update(sample.sample);
  API.doAction('refresh', { noConfirmation: true });

  function getName(existingAttachments, filename) {
    console.log({ existingAttachments, filename });
    if (!existingAttachments[filename]) {
      return filename;
    }
    let i = 0;
    do {
      if (filename.includes('.')) {
        const newName = filename.replace(/(.*)(\..*)/, '$1_' + i + '$2');
        if (!existingAttachments[newName]) {
          return newName;
        }
      } else {
        return filename + '_' + i;
      }
      i++;
    } while (i < 500);
  }
}

async function copyAnalysis(sample, original) {
  const cloned = JSON.parse(JSON.stringify(original));
  // where is this event coming from ?
  const jpath = [];
  // temporary variable to go up in hierarchy
  let current = original;
  while ((current = current.__parent)) {
    if (current.__name === '$content') break;
    jpath.push(current.__name);
  }
  jpath.reverse();

  const attachments = sample._attachments;

  // we need to keep dUrl if available and add mimetype of the file
  for (const key in cloned) {
    if (typeof cloned[key] === 'object' && cloned[key].filename) {
      if (original[key].dUrl) {
        cloned[key]._source = {
          dUrl: String(original[key].dUrl),
          ...attachments[cloned[key].filename],
          filename: cloned[key].filename,
        };
      }
    }
  }
  cloned._parentID = sample._id;

  const data = {
    // just a random uuid
    type: '11871ff4-e464-11ef-b4ba-7e5598b597fb',
    jpath,
    data: cloned,
  };

  await navigator.clipboard.writeText(JSON.stringify(data, undefined, 2));

  UI.showNotification('Analysis copied to clipboard', 'success');
}

function updateSample(sample) {
  if (!sample.$content.general) {
    sample.$content.general = {};
  }

  /** This is the old place we used to put the sequence.
   * By default we expect it is a peptidic sequence
   */
  if (sample.$content.general.sequence) {
    // eslint-disable-next-line no-console
    console.log('Migrating sequence', sample.$content.general.sequence);
    if (!sample.$content.biology) sample.$content.biology = {};
    if (!sample.$content.biology.peptidic) {
      sample.$content.biology.peptidic = [];
    }
    if (!sample.$content.biology.peptidic.length > 0) {
      sample.$content.biology.peptidic[0] = {};
    }
    if (!sample.$content.biology.peptidic[0].seq) {
      sample.$content.biology.peptidic[0].seq = [];
    }
    if (!sample.$content.biology.peptidic[0].seq.length > 0) {
      sample.$content.biology.peptidic[0].seq[0] = {};
    }
    sample.setChildSync(
      ['$content', 'biology', 'peptidic', 0, 'seq', 0, 'sequence'],
      sample.$content.general.sequence,
    );
    sample.$content.general.sequence = undefined;
  }
}
module.exports = Sample;
