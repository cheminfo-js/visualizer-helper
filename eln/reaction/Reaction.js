import API from 'src/util/api';
import elnPlugin from '../libs/elnPlugin';
import Roc from '../../rest-on-couch/Roc';
import Color from './color';

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
  console.log({ reaction });
  // small fix for missing seq in reagents
  updateEntry(reaction);

  if (reaction.$content.reagents) {
    var maxID =
      Math.max(...reaction.$content.reagents.map((r) => r.seq || 0)) + 1;
    reaction.$content.reagents.forEach((r) => {
      if (!r.seq) r.seq = maxID++;
    });
  }
  // for compatibility reason we need to upgrade old status
  Color.updateStatuses(reaction.$content.status);

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

function updateEntry(entry) {
  // update all reaction format
  if (entry.$content.procedure) {
    let value = entry.$content.procedure;
    if (value && value.type === 'html') {
      value = value.value;
      entry.$content.procedure = value;
    }
    if (value && value.includes('id="reagent_')) {
      value = value.replace(
        /<span id="reagent_([0-9]+)">([^<]*)<\/span>/g,
        '<a href="#reagent_$1">$2</a>',
      );
      entry.$content.procedure = value;
    }
  }
  if (entry.$content.keywords && !entry.$content.meta) {
    entry.$content.meta = {};
    for (let keyword of entry.$content.keywords) {
      entry.$content.meta[keyword.kind] = keyword.value;
    }
    delete entry.$content.keywords;
  }
  if (!entry.$content.meta) {
    entry.$content.meta = {};
  }
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
