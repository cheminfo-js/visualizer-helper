import API from 'src/util/api';
import Renderer from 'src/util/typerenderer';
import UI from 'src/util/ui';

import getViewInfo from './getViewInfo';

// ModulePrefsManager is created in the init script
// Any module may have a gear in the settings allowing to change preferences
// the system will either store in Roc or localStorge depending what is available

export class ModulePrefsManager {
  constructor(options = {}) {
    let promises = [];
    this.currentVersion = options.version;
    if (options.hasRoc) {
      let waitingRoc = new Promise((resolveRoc) => {
        this.resolveRoc = resolveRoc;
      }).then(() => {
        console.log('Roc initialized');
      });
      promises.push(waitingRoc);
    }
    let waitingView = getViewInfo().then((result) => {
      this.viewID = result._id;
    });
    promises.push(waitingView);

    let promiseAll = Promise.all(promises).then(() => {
      this.waiting = () => true;
    });
    this.waiting = () => promiseAll;
  }

  setRoc(roc) {
    this.roc = roc;
    this.resolveRoc();
  }

  async updateSlickGridPrefs(moduleID) {
    await this.waiting();
    const objectStructure = API.getModule(moduleID).data.resurrect()[0];

    const cols = JSON.parse(
      JSON.stringify(API.getModulePreferences(moduleID).cols),
    );
    cols.forEach((item) => {
      if (!item.id) item.id = Math.random();
    });

    const forceTypeChoices = Renderer.getList()
      .map((k) => `${k}:${k}`)
      .join(';');

    const result = await UI.editTable(cols, {
      remove: true,
      reorder: true,
      dialog: {
        title: 'Configure the columns of the module',
      },
      columns: [
        {
          id: 'id',
          name: 'name',
          jpath: ['name'],
          editor: Slick.CustomEditors.TextValue,
        },
        {
          id: 'rendererOptions',
          name: 'rendererOptions',
          jpath: ['rendererOptions'],
          editor: Slick.CustomEditors.TextValue,
        },
        {
          id: 'width',
          name: 'width',
          jpath: ['width'],
          editor: Slick.CustomEditors.NumberValue,
        },
        {
          id: 'forceType',
          name: 'forceType',
          jpath: ['forceType'],
          editor: Slick.CustomEditors.Select,
          editorOptions: { choices: forceTypeChoices },
        },
        {
          id: 'jpath',
          name: 'jpath',
          jpath: ['jpath'],
          editor: Slick.CustomEditors.JPathFactory(objectStructure),
          forceType: 'jpath',
          rendererOptions: {
            forceType: 'jpath',
          },
        },
      ],
    });

    if (!result) return;

    cols.forEach((item) => {
      item.formatter = 'typerenderer';
    });
    API.updateModulePreferences(moduleID, {
      cols: JSON.parse(JSON.stringify(cols)),
    });

    this.saveModulePrefs(moduleID, { cols });
  }

  async reloadModulePrefs(moduleID) {
    await this.waiting();
    if (this.roc) {
      this.reloadModulePrefsFromRoc(moduleID);
    } else {
      this.reloadModulePrefsFromLocalStorage(moduleID);
    }
  }

  async reloadModulePrefsFromLocalStorage(moduleID) {
    let prefs = JSON.parse(
      localStorage.getItem('viewModulePreferences') || '{}',
    );
    if (!prefs[this.viewID]) return;
    if (!prefs[this.viewID].version === this.currentVersion) return;
    if (moduleID && !prefs[this.viewID][moduleID]) return;
    if (moduleID) {
      API.updateModulePreferences(moduleID, prefs[this.viewID][moduleID]);
    } else {
      for (moduleID in prefs[this.viewID]) {
        API.updateModulePreferences(moduleID, prefs[this.viewID][moduleID]);
      }
    }
  }

  async getRecord() {
    let user = await this.roc.getUser();
    if (!user || !user.username) return undefined;
    const record = (
      await this.roc.view('entryById', {
        key: ['userModulePrefs', this.viewID],
      })
    )[0];
    return record;
  }

  async reloadModulePrefsFromRoc(moduleID) {
    const record = await this.getRecord();
    if (!record) return;
    if (record.$content.version !== this.currentVersion) {
      console.log('Not correct version', record.$content, this.currentVersion);
      return;
    }
    if (moduleID) {
      API.updateModulePreferences(moduleID, record.$content[moduleID]);
    } else {
      for (moduleID in record.$content[moduleID]) {
        API.updateModulePreferences(moduleID, record.$content[moduleID]);
      }
    }
  }

  async saveModulePrefs(moduleID, modulePrefs) {
    await this.waiting();
    if (this.roc) {
      this.saveModulePrefsToRoc(moduleID, modulePrefs);
    } else {
      this.saveModulePrefsToLocalStorage(moduleID, modulePrefs);
    }
  }

  async saveModulePrefsToLocalStorage(moduleID, modulePrefs) {
    let prefs = JSON.parse(
      localStorage.getItem('viewModulePreferences') || '{}',
    );
    if (!prefs[this.viewID]) prefs[this.viewID] = {};
    prefs[this.viewID].version = this.currentVersion;
    prefs[this.viewID][moduleID] = modulePrefs;
    localStorage.setItem('viewModulePreferences', JSON.stringify(prefs));
  }

  async saveModulePrefsToRoc(moduleID, modulePrefs) {
    let record = await this.getRecord();
    if (record) {
      record.$content.version = this.currentVersion;
      record.$content[moduleID] = modulePrefs;
      return this.roc.update(record);
    } else {
      let content = { version: this.currentVersion };
      content[moduleID] = modulePrefs;
      return this.roc.create({
        $id: ['userModulePrefs', this.viewID],
        $content: content,
        $kind: 'userModulePrefs',
      });
    }
  }
}

module.exports = ModulePrefsManager;
