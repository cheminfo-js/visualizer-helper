import API from 'src/util/api';
import UI from 'src/util/ui';

import Roc from '../../rest-on-couch/Roc';
import MolecularFormula from '../libs/MolecularFormula';
import { OCL, OCLUtils } from '../libs/OCLUtils';
import elnPlugin from '../libs/elnPlugin';

import Color from './color';

export async function load(uuid) {
  const couchUrl = API.cache('couchUrl');
  const database = API.cache('database');
  const roc = new Roc({
    url: couchUrl,
    database,
    kind: 'reaction',
    processor: elnPlugin,
  });

  API.cache('roc', roc);
  roc.getGroupMembership().then((groups) => API.cache('allGroups', groups));

  let userInfo = await roc.getUserInfo();
  userInfo.username = userInfo.username || userInfo.userId || userInfo.email;
  await API.createData('userInfo', userInfo);

  const emitter = roc.getDocumentEventEmitter(uuid);
  emitter.on('sync', () => API.createData('dataSynced', true));
  emitter.on('unsync', () => API.createData('dataSynced', false));

  API.cache('rocReaction', roc);

  const reaction = await roc.document(uuid, {
    varName: 'reaction',
    track: true,
  });

  updateEntry(reaction);

  let reactionVar = API.getVar('reaction');
  API.setVariable('reactionContent', reactionVar, ['$content']);
  API.setVariable('reagents', reactionVar, ['$content', 'reagents']);
  API.setVariable('reactionRXN', reactionVar, ['$content', 'reactionRXN']);
  API.setVariable('products', reactionVar, ['$content', 'products']);
  API.setVariable('title', reactionVar, ['$content', 'title']);
  API.setVariable('procedure', reactionVar, ['$content', 'procedure']);
  API.setVariable('conditions', reactionVar, ['$content', 'conditions']);
  API.setVariable('remarks', reactionVar, ['$content', 'remarks']);
  API.setVariable('code', reactionVar, ['$id']);
  API.setVariable('date', reactionVar, ['$content', 'date']);
  API.setVariable('status', reactionVar, ['$content', 'status']);
  API.setVariable('currentStatus', reactionVar, [
    '$content',
    'status',
    '0',
    'code',
  ]);
  API.setVariable('meta', reactionVar, ['$content', 'meta']);
  API.setVariable('attachments', reactionVar, ['attachmentList']);
  API.doAction('refreshSamples');
  if (API.getData('metaTemplate')) API.getData('metaTemplate').triggerChange();

  const overview = reaction._attachments
    ? reaction._attachments['overview.svg'] ||
      reaction._attachments['overview.png']
    : undefined;
  if (overview) {
    API.createData('overviewImage', overview.url);
  }
}

function updateEntry(reaction) {
  // update all reaction format
  if (reaction.$content.procedure) {
    let value = reaction.$content.procedure;
    if (value && value.type === 'html') {
      value = value.value;
    }
    if (value && value.includes('id="reagent_')) {
      value = value.replace(
        /<span id="reagent_([0-9]+)">([^<]*)<\/span>/g,
        '<a href="#reagent_$1">$2</a>',
      );
    }
    // we need to replace all &nbsp; and ascii 160 to space
    value = value.replaceAll('&nbsp;', ' ');
    value = value.replaceAll(String.fromCharCode(160), ' ');
    reaction.$content.procedure = value;
  }
  if (reaction.$content.keywords && !reaction.$content.meta) {
    reaction.$content.meta = {};
    for (let keyword of reaction.$content.keywords) {
      reaction.$content.meta[keyword.kind] = keyword.value;
    }
    delete reaction.$content.keywords;
  }
  if (!reaction.$content.meta) {
    reaction.$content.meta = {};
  }
  if (reaction.$content.reagents) {
    let maxID =
      Math.max(...reaction.$content.reagents.map((r) => r.seq || 0)) + 1;
    reaction.$content.reagents.forEach((r) => {
      if (!r.seq) r.seq = maxID++;
    });

    // do we have the property reagents.X.partsByWeight
    for (const reagent of reaction.$content.reagents) {
      if (!reagent.partsByWeight) {
        if (reagent.g) {
          reagent.partsByWeight = reagent.g;
        } else {
          reagent.partsByWeight = '';
        }
      }
    }
  }

  if (reaction.$content.products) {
    let maxID =
      Math.max(...reaction.$content.products.map((p) => p.seq || 0)) + 1;
    reaction.$content.products.forEach((p) => {
      if (!p.seq) p.seq = maxID++;
    });

    // do we have the property reagents.X.partsByWeight
    for (const product of reaction.$content.products) {
      if (!product.kind) {
        product.kind = 'pure';
      }
    }
  }

  // for compatibility reason we need to upgrade old status
  Color.updateStatuses(reaction.$content.status);
}

export async function loadViewPreferences() {
  const roc = API.cache('roc');
  if (!roc) return;
  let userInfo = API.cache('userInfo');
  if (!userInfo || !userInfo.email || !userInfo.email.includes('@')) return;
  let userViewPrefs = await roc.UserViewPrefs.get();
  if (!userViewPrefs) {
    userViewPrefs = {};
    let cookie = localStorage.getItem('eln-procedure-snipets');
    if (cookie) {
      userViewPrefs.snipets = JSON.parse(cookie);
    } else {
      userViewPrefs.snipets = [
        {
          key: 'wus',
          html: 'The reaction was quenched with a diluted solution of sodium hydroxide. The organic phase was separated, dried of magnesium sulfate and concentrated under reduced pressure. ',
        },
        {
          key: 'fla',
          html: 'The crude sample was purified by flash chromatography. ',
        },
      ];
    }
    roc.UserViewPrefs.set(userViewPrefs);
  }
  if (userViewPrefs.autoupdate === undefined) {
    userViewPrefs.autoupdate = false;
  }
  if (userViewPrefs.defaultMetas === undefined) {
    userViewPrefs.defaultMetas = [];
  }
  await API.createData('userViewPrefs', userViewPrefs);
  let userViewPrefsVar = API.getVar('userViewPrefs');
  API.setVariable('snipets', userViewPrefsVar, ['snipets']);
  API.setVariable('defaultMetas', userViewPrefsVar, ['defaultMetas']);
}

export async function selectProduct(reactionRXN, options = {}) {
  const { allowEmpty = false } = options;
  const rxn = OCL.Reaction.fromRxn(`${reactionRXN}`);
  const rows = [];
  for (let i = 0; i < rxn.getProducts(); i++) {
    const product = rxn.getProduct(i);
    const row = getRowFromMolecule(product);
    row.kind = 'pure';
    rows.push(row);
  }

  for (let i = 0; i < rxn.getReactants(); i++) {
    const reactant = rxn.getReactant(i);
    const row = getRowFromMolecule(reactant);
    row.kind = 'starting material';
    rows.push(row);
  }
  if (allowEmpty) {
    const emptyMolecule = OCL.Molecule.fromSmiles('');
    const row = getRowFromMolecule(emptyMolecule);
    row.kind = 'crude';
    rows.push(row);
  }
  if (rows.length === 0) {
  } else if (rows.length === 1) {
    return rows[0];
  } else {
    const chooseList = [];
    for (let i = 0; i < rows.length; i++) {
      chooseList.push({
        row: rows[i],
        mf: rows[i].mf,
        mw: rows[i].mw.toFixed(2),
        id: i,
      });
    }
    const selected = await UI.choose(chooseList, {
      autoSelect: true,
      noConfirmation: true,
      returnRow: true,
      idField: 'id',
      slick: {
        rowHeight: 150,
      },
      columns: [
        {
          id: 'molfile',
          name: 'molfile',
          jpath: ['row', 'molfile'],
          rendererOptions: {
            forceType: 'mol2d',
          },
        },
        {
          id: 'mf',
          name: 'mf',
          field: 'mf',
        },
        {
          id: 'mw',
          name: 'mw',
          field: 'mw',
        },
      ],
    });
    if (!selected) return;
    return rows[selected.id];
  }
}

function getRowFromMolecule(molecule) {
  const row = {};
  const mf = OCLUtils.getMF(molecule).mf;
  row.mf = mf;
  const mfInfo = new MolecularFormula.MF(String(mf)).getInfo();
  row.mw = mfInfo.mass;
  row.em = mfInfo.monoisotopicMass;

  const ocl = molecule.getIDCodeAndCoordinates();

  row.ocl = {
    value: ocl.idCode,
    coordinates: ocl.coordinates,
  };
  Object.defineProperty(row.ocl, 'index', {
    enumerable: false,
    value: molecule.getIndex(),
    writable: true,
  });

  Object.defineProperty(row, 'molfile', {
    enumerable: false,
    value: molecule.toMolfileV3(),
    writable: true,
  });
  return row;
}
