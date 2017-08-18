import Datas from 'src/main/datas';
import ExpandableMolecule from './ExpandableMolecule';
import MF from './MF';
import API from 'src/util/api';
import IDB from 'src/util/IDBKeyValue';

const DataObject = Datas.DataObject;
const idb = new IDB('external-samples');

const defaultOptions = {
    varName: 'sample'
};

class Sample {
    constructor(sample, options) {
        // make sure we don't copy attachment metadata
        const s = sample.$content ? {
            $content: {
                general: sample.$content.general,
                identifier: sample.$content.identifier,
                stock: sample.$content.stock
            }
        } : {
            $content: {
                general: {}
            }
        };

        this.sample = JSON.parse(JSON.stringify(s));
        this.options = Object.assign({}, defaultOptions, options);
        Object.assign(this.sample, this.options.sample);
        this._init();
    }

    _loadSample(sample) {
        this.sample = sample;
        var sampleVar = API.getVar(this.options.varName);

        API.setVariable('sampleCode', sampleVar, ['$id', 0]);
        API.setVariable('batchCode', sampleVar, ['$id', 1]);
        API.setVariable('content', sampleVar, ['$content']);
        API.setVariable('general', sampleVar, ['$content', 'general']);
        API.setVariable('molfile', sampleVar, ['$content', 'general', 'molfile']);
        API.setVariable('mf', sampleVar, ['$content', 'general', 'mf']);
        API.setVariable('mw', sampleVar, ['$content', 'general', 'mw']);
        API.setVariable('em', sampleVar, ['$content', 'general', 'em']);
        API.setVariable('description', sampleVar, ['$content', 'general', 'description']);
        API.setVariable('iupac', sampleVar, ['$content', 'general', 'iupac']);

        this.expandableMolecule = new ExpandableMolecule(this.sample, this.options);
        this.mf = new MF(this.sample);
        this.mf.fromMF();

        this.onChange = (event) => {
            var jpathStr = event.jpath.join('.');

            // We have modified the nmr annotations
            if (jpathStr.replace(/\.\d+\..*/, '') === '$content.spectra.nmr') {
                // execute peak picking
                var currentNmr = this.sample.getChildSync(jpathStr.replace(/(\.\d+)\..*/, '$1').split('.'));
                this.nmr1dManager.executePeakPicking(currentNmr);
                // this.nmr1dManager.updateIntegrals();
            }

            switch (event.jpath.join('.')) {
                case '$content.general.molfile':
                    this.mf.fromMolfile();
                    break;
                case '$content.general.mf':
                    try {
                        this.mf.fromMF();
                    } catch (e) {
                        // ignore
                    }
                    break;
                default:
                    break;
            }

            const contentString = JSON.stringify(this.sample.$content);
            if ((contentString !== this.contentString) && this.options.trackId) {
                this.contentString = JSON.stringify(this.sample.$content);
                idb.set(this.options.trackId, this.sample.resurrect());
            }
        };

        this.bindChange();
    }

    async _init() {
        this._initialized = new Promise(async (resolve) => {
            var sample;
            if (this.options.trackId) {
                try {
                    sample = await idb.get(this.options.trackId);
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error(e);
                    sample = this.sample;
                    this.options.trackId = false;
                }
            }
            sample = await API.createData(this.options.varName, sample || this.sample);
            this._loadSample(sample);
            resolve();
        });
    }


    bindChange() {
        this.sample.unbindChange(this.onChange);
        this.sample.onChange(this.onChange);
    }

    unbindChange() {
        this.sample.unbindChange(this.onChange);
    }


    handleDrop(name) {
        if (!name) {
            throw new Error('handleDrop expects a variable name');
        }
        name = String(name);
        // maps name of variable to type of data
        var types = {
            droppedNmr: 'nmr',
            droppedIR: 'ir',
            droppedMS: 'mass'
        };

        if (!types[name]) {
            throw new Error('Unexpected variable name');
        }

        // Dropped data can be an array
        // Expecting format as from drag and drop module
        var droppedDatas = API.getData(name);
        droppedDatas = droppedDatas.file || droppedDatas.str;
        var prom = Promise.resolve();
        for (let i = 0; i < droppedDatas.length; i++) {
            prom = prom.then(() => {
                var data = DataObject.resurrect(droppedDatas[i]);
                return this.roc.attach(types[name], this.sample, data);
            });
        }
    }

    handleAction(action) {
        if (!action) return;

        if (this.expandableMolecule) {
            this.expandableMolecule.handleAction(action);
        }
    }
}

module.exports = Sample;
