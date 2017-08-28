import API from 'src/util/api';
import Roc from '../rest-on-couch/Roc';

export async function analysisFactory(analysisId, sampleId, options = {}) {
    const kind = 'analysis';
    const {
        url = undefined,
        database = 'eln',
        category = '',
        description = '',
        result = [],
        preference = {}
    } = options;

    var roc = new Roc({url, database, kind});
    var existing = (await roc.view('analysisBySampleAndId', {key: [sampleId, analysisId]}))[0];

    var rocOptions = {
        track: true,
        varName: 'viewAnalysis'
    };
    var analysisRoc;
    if (existing) {
        analysisRoc = await roc.document(existing._id, rocOptions);
    } else {
        var created = await roc.create({
            $id: [sampleId, analysisId],
            $content: {
                results: [{result, preference}],
                category,
                description
            },
            $kind: kind
        });
        analysisRoc = await roc.document(created._id, rocOptions);
    }

    var viewAnalysis = new Analysis(roc, analysisRoc);
    await API.cache(name, viewAnalysis);
    return viewAnalysis;
}

export class Analysis {
    constructor(roc, analysisRoc) {
        this.roc = roc;
        this.analysis = analysisRoc;
    }

    async save() {
        await this.roc.update(this.analysis);
    }
}
