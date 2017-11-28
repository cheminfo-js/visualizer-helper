import API from 'src/util/api';
import OCLE from './libs/OCLE';

const noop = () => {/* noop */};

const defaultOptions = {
    onMolfileChanged: noop,
    calculateDiastereotopicID: false,
    maxDiastereotopicCalculationTime: 3000
};

class ExpandableMolecule {
    constructor(sample, options) {
        this.options = Object.assign({}, defaultOptions, options);
        this.sample = sample;
        this.molfile = String(this.sample.getChildSync(['$content', 'general', 'molfile']) || '');
        this.idCode = OCLE.Molecule.fromMolfile(this.molfile).getIDCode();
        this.expandedHydrogens = false;
        this.jsmeEditionMode = false;
        this.calculateDiastereotopicID = this.options.calculateDiastereotopicID;
        this.maxDiastereotopicCalculationTime = this.options.maxDiastereotopicCalculationTime;

        this.onChange = (event) => {
            // us this really a modification ? or a loop event ...
            // need to compare former oclID with new oclID
            var newMolecule = OCLE.Molecule.fromMolfile(event.target + '');

            var oclID = newMolecule.getIDCodeAndCoordinates();
            if (oclID.idCode !== this.idCode) {
                this.idCode = oclID.idCode;
                this.molfile = event.target + '';
                this.sample.setChildSync(['$content', 'general', 'molfile'], this.molfile);
                this.sample.setChildSync(['$content', 'general', 'ocl'], {
                    value: oclID.idCode,
                    coordinates: oclID.coordinates,
                    index: newMolecule.getIndex()
                });
            }
            this.options.onMolfileChanged(this);
        };


        API.createData('editableMolfile', this.molfile).then(
            (editableMolfile) => {
                this.editableMolfile = editableMolfile;
                this.bindChange();
                this.createViewVariable();
            }
        );
    }

    bindChange() {
        this.editableMolfile.onChange(this.onChange);
    }

    unbindChange() {
        this.editableMolfile.unbindChange(this.onChange);
    }

    toggleJSMEEdition() {
        this.jsmeEditionMode = !this.jsmeEditionMode;
        this.expandedHydrogens = false;
        let options = {
            prefs: []
        };

        if (this.jsmeEditionMode) {
            options.prefs.push('nodepict');
            API.createData('editableMolfile', this.molfile);
        } else {
            options.prefs.push('depict');
            this.createViewVariable();
        }
        API.doAction('setJSMEOptions', options);
    }

    setExpandedHydrogens() {
        if (this.jsmeEditionMode) {
            this.toggleJSMEEdition();
        } else {
            this.expandedHydrogens = !this.expandedHydrogens;
        }
        this.createViewVariable();
    }

    /*
    We create the view variable with or without expanded hydrogens
     */
    createViewVariable() {
        var molecule = OCLE.Molecule.fromMolfile(this.molfile);
        let calculateDiastereotopicID = this.calculateDiastereotopicID;
        if (calculateDiastereotopicID) {
            // is it reasonnable to calculate the DiastereotopicID. We check the time it will take

            var start = Date.now();
            molecule.getCompactCopy().getIDCode();
            let expected = (Date.now() - start) * 4 * molecule.getAllAtoms();
            if (expected > this.maxDiastereotopicCalculationTime) {
                // eslint-disable-next-line no-console
                console.log('The diastereotopic calculation is expected to last more than 3s. No way to assign molecule.',
                    this.maxDiastereotopicCalculationTime);
                calculateDiastereotopicID = false;
            }
        }
        if (this.expandedHydrogens) {
            molecule.addImplicitHydrogens();
            let viewMolfileExpandedH = molecule.toVisualizerMolfile({
                diastereotopic: calculateDiastereotopicID
            });
            API.createData('viewMolfileExpandedH', viewMolfileExpandedH);
        } else {
            let viewMolfile = molecule.toVisualizerMolfile({
                heavyAtomHydrogen: true,
                diastereotopic: calculateDiastereotopicID
            });
            API.createData('viewMolfile', viewMolfile);
        }
    }

    handleAction(action) {
        if (!action) return false;
        switch (action.name) {
            case 'toggleJSMEEdition':
                this.toggleJSMEEdition(!this.jsmeEditionMode);
                break;
            case 'clearMolfile':
                var molfile = API.getData('editableMolfile');
                molfile.setValue('');
                break;
            case 'swapHydrogens':
                this.setExpandedHydrogens();
                break;
            default:
                return false;
        }
        return true;
    }
}

module.exports = ExpandableMolecule;
