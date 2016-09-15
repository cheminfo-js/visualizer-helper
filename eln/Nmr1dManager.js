'use strict'

define([
    'file-saver',
    'src/util/api',
    'src/util/ui',
] , function (fileSaver, API, UI) {

    
    class Nmr1dManager {
        constructor(couchDB) {
           
        }

        handleAction(action) {
            switch (action.name) {
                case 'reset1d':
                case 'reset2d':
                    if (this.event !== 'action') return;

                    var type;
                    if (action.name === 'reset1d') type = '1'
                    else if (action.name === 'reset2d') type = '2'
                    else return;

                    var legend = API.cache('legend');
                    if (!legend) {
                        legend = {
                            1: {},
                            2: {}
                        }
                        API.cache('legend', legend);
                    }

                    legend[type] = {};

                    type = type + 'd';
                    API.createData('black', null);
                    API.createData('annot' + type, null);
                    API.createData('legend' + type, {});
                    API.createData('acs', null);

                    break;
                case 'executePeakPicking':
                    //API.doAction("reset1d");
                    // the action may be generated by clicking on a line or clicking on the button to
                    // recalculate the peak picking.
                    
                    var currentNmr;
                    if (action.value.dimension) { // Fired from click on row. We can not take variable because it may not exist yet
                        currentNmr = action.value;
                        if (currentNmr.dimension > 1) {
                            API.createData('black2d', currentNmr.jcamp.data);
                            API.switchToLayer('2D');
                            return;
                        } else {
                            API.switchToLayer('Default layer');
                            API.createData('black1d', currentNmr.jcamp.data);
                        }
                    } else { // we click on the button, show an alert if we want to redo peak picking
                        currentNmr = API.getData('currentNmr');
                        if (currentNmr.dimension > 1) {
                            if (typeof UI != "undefined")
                                UI.showNotification('Peak picking can only be applied on 1D spectra', 'warning');
                            return;
                        }
                    }
                    if (action.value.integral) {//Fired from button
                        doNmrAssignement();
                    } else {
                        if (!currentNmr.range || ! currentNmr.range.length) {
                            doNmrAssignement();
                        }
                    }
                    API.createData("nmrParams", {
                        "nucleus": currentNmr.nucleus[0],
                        "observe": Math.floor(currentNmr.frequency / 10) * 10
                    });
                    break;
                default:
                    return false;
            }
            return true;
        }




        doNmrAssignement() {
            var jcamp = currentNmr.getChild(['jcamp', 'data']);
            console.log(doNmrAssignement);
            console.log('jcamp',jcamp.length);

            jcamp.then(function(jcamp) {
                jcamp = String(jcamp.get());
                var ppOptions = JSON.parse(JSON.stringify(API.getData("nmr1hOptions"))) || {};
                var integral = ppOptions.integral;
                if(!ppOptions.noiseFactor){
                    ppOptions = {
                        noiseFactor:0.8,
                        clean:true,
                        compile:true,
                        optimize:false,
                        integralFn:"sum",
                        type:"1H"};
                }

                var spectrum = SD.NMR.fromJcamp(jcamp);
                var intFN = 0;
                if(ppOptions.integralFn=="peaks"){
                    intFN=1;
                }
                var peakPicking = spectrum.nmrPeakDetection({"nH":integral,
                    realTop:true,
                    thresholdFactor:ppOptions.noiseFactor,
                    clean:ppOptions.clean,
                    compile:ppOptions.compile,
                    optimize:ppOptions.optimize,
                    integralFn:intFN,
                    idPrefix:spectrum.getNucleus()+"",
                    gsdOptions:{minMaxRatio:0.001, smoothY:false, broadWidth:0},
                    format:"new"
                });
                currentNmr.setChildSync(['range'], peakPicking);
            });

        }


        _initializeNMRAssignment() {
            var promise = Promise.resolve();
            promise = promise.then(() => API.createData('nmr1hOptions', {
                    "noiseFactor": 0.8,
                    "clean": true,
                    "compile": true,
                    "optimize": false,
                    "integralFn": "sum",
                    "integral": 30,
                    "type": "1H"
                })
            );

            promise=promise.then(() => API.createData('nmr1hOndeTemplates', {
                "full": {
                    "type": "object",
                    "properties": {
                        "integral": {
                            "type": "number",
                            "title": "value to fit the spectrum integral",
                            "label": "Integral"
                        },
                        "noiseFactor": {
                            "type": "number",
                            "title": "Mutiplier of the auto-detected noise level",
                            "label": "noiseFactor"
                        },
                        "clean": {
                            "type": "boolean",
                            "title": "Delete signals with integration less than 0.5",
                            "label": "clean"
                        },
                        "compile": {
                            "type": "boolean",
                            "title": "Compile the multiplets",
                            "label": "compile"
                        },
                        "optimize": {
                            "type": "boolean",
                            "title": "Optimize the peaks to fit the spectrum",
                            "label": "optimize"
                        },
                        "integralFn": {
                            "type": "string",
                            "title": "Type of integration",
                            "label": "Integral type",
                            "enum": [
                                "sum",
                                "peaks"
                            ]
                        },
                        "type": {
                            "type": "string",
                            "title": "Nucleus",
                            "label": "Nucleus",
                            "editable": false
                        }
                    }
                },
                "short": {
                    "type": "object",
                    "properties": {
                        "integral": {
                            "type": "number",
                            "title": "value to fit the spectrum integral",
                            "label": "Integral"
                        }
                    }
                }
            }));
            promise=promise.then((nmr1hOndeTemplates) => API.createData('nmr1hOndeTemplate', nmr1hOndeTemplates.short));
            return promise;
        }
    }
        

    return Nmr1dManager;
});

