// this class is not really related to a sampleToc but can be used for any TOC

import API from 'src/util/api';
import Versioning from 'src/util/versioning';

let defaultOptions = {
  group: 'all',
  varName: 'sampleToc',
  viewName: 'sample_toc',
  filter: (entry) => !entry.value.hidden,
  sort: (a, b) => {
    if (a.value.modified && a.value.modified > b.value.modified) {
      return -1;
    } else if (
      a.value.modificationDate &&
      a.value.modificationDate > b.value.modificationDate
    ) {
      return -1;
    } else if (a.value.modified && a.value.modified < b.value.modified) {
      return 1;
    } else if (
      a.value.modificationDate &&
      a.value.modificationDate < b.value.modificationDate
    ) {
      return 1;
    } else {
      return 0;
    }
  },
};

class Toc {
  /**
   * Create an object managing the Toc
   * @param {object} [options={}]
   * @param {object} [roc=undefined]
   * @param {string} [options.group='mine'] Group to retrieve products. mine, all of a specific group name
   * @param {string} [options.varName='sampleToc']
   * @param {string} [options.viewName='sample_toc']
   * @param {function} [options.sort] Callback, by default sort by reverse date
   * @param {function} [options.filter] Callback to filter the result
   * @param {function} [options.callback] Callback to apply on each entry
   */
  constructor(roc, options = {}) {
    this.roc = roc;
    this.options = Object.assign({}, defaultOptions, options);
  }

  setFilter(filter) {
    this.options.filter = filter;
    return this.refresh();
  }

  /**
   * Retrieve the toc and put the result in the specified variable
   *
   */
  refresh(options = {}) {
    let {
      group,
      sort,
      filter,
      viewName,
      limit,
      startkey,
      endkey,
      key,
      descending,
    } = Object.assign({}, this.options, options);
    let mine = 0;
    let groups = '';
    group = String(group);
    if (group === 'mine') {
      mine = 1;
    } else if (group !== 'all') {
      groups = group;
    }
    return this.roc
      .query(viewName, {
        groups,
        mine,
        sort,
        filter,
        limit,
        startkey,
        endkey,
        key,
        descending,
        varName: this.options.varName,
      })
      .then((entries) => {
        if (this.options.callback) {
          entries.forEach(this.options.callback);
        }
        return entries;
      });
  }

  async initializeSampleFilter(options = {}) {
    const {
      twigVarName = 'sampleFilterTwig',
      varName = 'sampleFilter',
      cookieName = 'eln-default-sample-filter',
      filter,
      autoRefresh = true,
      listAllGroups = false,
    } = options;

    let groups = [];
    if (listAllGroups) {
      groups = (await this.roc.getGroupsInfo()).map((g) => g.name);
    } else {
      groups = (await this.roc.getGroupMembership()).map((g) => g.name);
    }

    const defaultSampleFilter = {
      group: 'mine',
      startEpoch: 24 * 3600 * 1000 * 31,
      endEpoch: '',
    };
    const sampleFilter = localStorage.getItem(cookieName)
      ? JSON.parse(localStorage.getItem(cookieName))
      : defaultSampleFilter;
    delete sampleFilter.startEpoch;
    delete sampleFilter.endEpoch;
    if (sampleFilter.previousGroup && !sampleFilter.group) {
      sampleFilter.group = sampleFilter.previousGroup;
    }

    this.updateOptions(sampleFilter);

    API.createData(varName, sampleFilter);

    const sampleFilterTwig = `
{% if sampleFilter.startEpoch %}
<span style="color: red; font-size: 1.3em; font-weight: bold">Searching for a specific sample.</span>&nbsp;<button onclick="resetFilterOptions()">Reset</button>
{% else %}
<div style="display: flex">
<div>
Group: <select name="group">
<option value='all'>All</option>
<option value='mine'>Mine</option>
${groups.map((group) => '<option value="' + group + '">' + group + '</option>')}
</select>
</div>
<div>&nbsp;</div>
<div>
Modified: <select name="dateRange">
<option value='${24 * 3600 * 1000 * 31}'>Last month</option>
<option value='${24 * 3600 * 1000 * 91}'>Last 3 months</option>
<option value='${24 * 3600 * 1000 * 182}'>Last 6 months</option>
<option value='${24 * 3600 * 1000 * 365}'>Last year</option>
<option value='${24 * 3600 * 1000 * 730}'>Last 2 years</option>
<option value='${24 * 3600 * 1000 * 1830}'>Last 5 years</option>
<option value=''>Any time</option>
</select>
</div>
</div>
{% endif %}
<script>
function resetFilterOptions() {
  const sampleFilter = API.getData('sampleFilter');
  sampleFilter.endEpoch = undefined;
  sampleFilter.startEpoch = undefined;
  if (sampleFilter.previousGroup) {
    sampleFilter.group = sampleFilter.previousGroup;
  }
  sampleFilter.triggerChange()
}
</script>
`;
    API.createData(twigVarName, sampleFilterTwig);

    if (autoRefresh) {
      await this.refresh(filter);
    }
    let mainData = Versioning.getData();
    mainData.onChange((evt) => {
      if (evt.jpath[0] === varName) {
        const currentSampleFilter = API.getData(varName).resurrect();
        localStorage.setItem(cookieName, JSON.stringify(currentSampleFilter));
        this.updateOptions(currentSampleFilter);
        this.refresh();
      }
    });
  }

  updateOptions(options) {
    this.options.group = options.group;
    if (options.startEpoch || options.endEpoch) {
      this.options.startkey = options.startEpoch;
      this.options.endkey = options.endEpoch;
    } else {
      this.options.startkey = options.dateRange
        ? Date.now() - options.dateRange
        : undefined;
      this.options.endkey = undefined;
    }
  }

  /**
   * Retrieve the allowed groups for the logged in user and create 'groupForm'
   * variable and 'groupFormSchema' (for onde module). It will keep in a cookie
   * the last selected group. Calling this method should reload automatically
   * @param {object} [options={}]
   * @param {string} [varName='groupForm'] contains the name of the variable containing the form value
   * @param {string} [schemaVarName='groupFormSchema'] contains the name of the variable containing the form schema
   * @param {string} [cookieName='eln-default-sample-group''] cookie name containing the last selected group
   * @param {string} [filter] filter applied on first refresh
   * @param {string} [autoRefresh=true] refresh least after initialization
   * @param {boolean} [listAllGroups=true] select from any group, even if not the a member
   * @return {string} the form to select group}
   */
  async initializeGroupForm(options = {}) {
    const {
      schemaVarName = 'groupFormSchema',
      varName = 'groupForm',
      cookieName = 'eln-default-sample-group',
      filter,
      autoRefresh = true,
      listAllGroups = false,
    } = options;

    let groups = [];
    if (listAllGroups) {
      groups = (await this.roc.getGroupsInfo()).map((g) => g.name);
    } else {
      groups = (await this.roc.getGroupMembership()).map((g) => g.name);
    }

    var possibleGroups = ['all', 'mine'].concat(groups);
    var defaultGroup = localStorage.getItem(cookieName);
    if (possibleGroups.indexOf(defaultGroup) === -1) {
      defaultGroup = 'all';
    }
    var schema = {
      type: 'object',
      properties: {
        group: {
          type: 'string',
          enum: possibleGroups,
          default: defaultGroup,
          required: true,
        },
      },
    };
    API.createData(schemaVarName, schema);

    let groupForm = await API.createData(varName, { group: defaultGroup });

    this.options.group = groupForm.group;
    if (autoRefresh) {
      await this.refresh(filter);
    }
    let mainData = Versioning.getData();
    mainData.onChange((evt) => {
      if (evt.jpath[0] === varName) {
        localStorage.setItem(cookieName, groupForm.group);
        this.options.group = String(groupForm.group);
        this.refresh();
      }
    });

    return groupForm;
  }
}

module.exports = Toc;
