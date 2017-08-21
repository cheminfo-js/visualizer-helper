import API from 'src/util/api';
import Roc from '../rest-on-couch/Roc';
import IDB from 'src/util/IDBKeyValue';

export async function preferenceFactory(id, options) {
    const {
        kind = 'viewOptions',
        url = undefined,
        database = 'eln',
        initial = []
    } = options;

    var roc = new Roc({
        url: url,
        database: database,
        kind: kind
    });

    var idb = new IDB(kind);

    var existing = await roc.view('entryByKindAndId', {key: [kind, id]});
    var preferenceRoc = existing[0];
    var newVariable = !preferenceRoc;
    var local;
    try {
        local = await idb.get(id);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        idb = false;
    }

    if (local) {
        preferenceRoc = local;
    } else if (newVariable) {
        preferenceRoc = {
            $id: id,
            $content: initial,
            $kind: kind
        };
    }

    preferenceRoc = await API.createData(id, preferenceRoc);
    var preferenceVar = API.getVar(id);
    API.setVariable('preferences', preferenceVar, ['$content']);

    return new Preference(id, roc, idb, preferenceRoc, newVariable);
}

export class Preference {
    constructor(id, roc, idb, preferenceRoc, newVariable) {
        this.id = id;
        this.roc = roc;
        this.idb = idb;
        this.preference = preferenceRoc;
        this.newVariable = newVariable;
        this.contentString = JSON.stringify(this.preference);

        this.onChange = () => {
            const contentString = JSON.stringify(this.preference);
            if (contentString !== this.contentString) {
                this.contentString = contentString;
                this.idb.set(this.id, JSON.parse(contentString));
            }
        };

        this.bindChange();
    }

    bindChange() {
        this.preference.unbindChange(this.onChange);
        this.preference.onChange(this.onChange);
    }

    unbindChange() {
        this.preference.unbindChange(this.onChange);
    }

    async save() {
        if (this.newVariable) {
            await this.roc.update(this.preference);
        } else {
            this.newVariable = false;
            this.preference = await this.roc.create(this.preference);
        }
    }
}
