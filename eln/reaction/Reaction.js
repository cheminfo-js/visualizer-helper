import API from 'src/util/api';
import elnPlugin from '../libs/elnPlugin';
import Roc from '../../rest-on-couch/Roc';
import Color from './color';
import UI from 'src/util/ui';
import { OCL, OCLUtils } from '../libs/OCLUtils';
import MolecularFormula from '../libs/MolecularFormula';

export async function load(uuid) {
  const couchUrl = API.cache('couchUrl');
  const database = API.cache('database');
  const roc = new Roc({
    url: couchUrl,
    database: database,
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

  var reactionVar = API.getVar('reaction');
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

export async function selectProduct(reactionRXN) {
  const rxn = OCL.Reaction.fromRxn(reactionRXN + '');
  const products = [];
  for (let i = 0; i < rxn.getProducts(); i++) {
    const product = rxn.getProduct(i);
    products.push({
      molecule: product,
      molfile: product.toMolfile(),
      mf: OCLUtils.getMF(product).mf,
      kind: 'pure',
    });
  }

  const reactants = [];
  for (let i = 0; i < rxn.getReactants(); i++) {
    const reactant = rxn.getReactant(i);
    reactants.push({
      molecule: reactant,
      molfile: reactant.toMolfile(),
      mf: OCLUtils.getMF(reactant).mf,
      kind: 'starting material',
    });
  }

  const rows = [];
  for (let product of products) {
    const row = {};
    row.mf = product.mf;
    row.kind = product.kind;
    const mfInfo = new MolecularFormula.MF(String(row.mf)).getInfo();
    row.mw = mfInfo.mass;
    row.em = mfInfo.monoisotopicMass;
    if (product.molfile) {
      const molecule = OCL.Molecule.fromMolfile(product.molfile);
      row.ocl = molecule.getIDCodeAndCoordinates();
      row.ocl.index = molecule.getIndex();
      row.molfile = product.molfile;
    }
    rows.push(row);
  }

  // we add the combination of all the products
  if (rows.length > 1) {
    let totalRow = {
      mf: rows.map((p) => p.mf).join(' . '),
      mw: rows.reduce((sum, p) => (sum += p.mw), 0),
      em: rows.reduce((sum, p) => (sum += p.em), 0),
      kind: 'pure',
    };
    let molecule = OCL.Molecule.fromMolfile(rows[0].molfile);
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      let moleculeToAdd = OCL.Molecule.fromMolfile(rows[i].molfile);
      molecule.addMolecule(moleculeToAdd);
      molecule.inventCoordinates();
      totalRow.molfile = molecule.toMolfile();
      totalRow.ocl = molecule.getIDCodeAndCoordinates();
      totalRow.ocl.index = molecule.getIndex();
    }
    rows.push(totalRow);
  }

  for (let reactant of reactants) {
    const row = {};
    row.mf = reactant.mf;
    row.kind = reactant.kind;
    const mfInfo = new MolecularFormula.MF(String(row.mf)).getInfo();
    row.mw = mfInfo.mass;
    row.em = mfInfo.monoisotopicMass;
    if (reactant.molfile) {
      var molecule = OCL.Molecule.fromMolfile(reactant.molfile);
      row.ocl = molecule.getIDCodeAndCoordinates();
      row.ocl.index = molecule.getIndex();
      row.molfile = reactant.molfile;
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    return;
  } else if (rows.length === 1) {
    return rows[0];
  } else {
    const chooseList = [];
    for (var i = 0; i < rows.length; i++) {
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
