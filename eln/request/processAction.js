import API from 'src/util/api';
import UI from 'src/util/ui';

import Status from './Status';

let roc;
let requestManager;

async function processAction(actionName, actionValue) {
  roc = this.roc;
  requestManager = this;
  switch (actionName) {
    case 'requestFromScan':
      requestFromScan(actionValue);
      break;
    case 'requestFromUUID':
      requestFromScan(actionValue);
      break;
    case 'deleteActivity':
      deleteActivity(actionValue);
      break;
    case 'changeStatus':
      {
        const request = API.getData('request');
        if (!request || !request.$content) {
          UI.showNotification('No request selected', 'error');
          return;
        }
        const newStatusObject = await askNewStatus(request);
        if (!newStatusObject) return;
        await prependStatus(request, newStatusObject);
        request.triggerChange();
        API.doAction('refreshRequests');
      }
      break;
    case 'createForm':
      createForm();
      break;
    case 'refreshRequests':
      refreshRequests(API.getData('preferences'));
      break;
    case 'updateFilters':
      refreshRequests(actionValue);
      break;
    case 'bulkChangeStatus':
      await bulkChangeStatus(API.getData('selected'));
      API.doAction('refreshRequests');
      API.createData('status', []);
      API.doAction('setSelected', []);
      break;
    default:
      throw Error(`the action "${actionValue}" is unknown`);
  }
}

async function deleteActivity(activity) {
  const ok = await UI.confirm('Are you sure you want to delete this activity?');
  if (!ok) return;
  const status = API.getData('status');
  const roc = API.cache('roc');
  const request = API.getData('request');
  const position = status.indexOf(activity);
  if (position >= 0) {
    status.splice(position, 1);
    status.triggerChange();
    await roc.update(request);
  }
}

async function requestFromScan(scan) {
  let request = await requestManager.getRequest(scan);
  if (!request) {
    await API.createData('request', {});
    return;
  }

  await API.createData('request', request);
  let requestVar = await API.getVar('request');
  API.setVariable('status', requestVar, ['$content', 'status']);
}

async function refreshRequests(options) {
  let queryOptions = {
    sort: (a, b) => b.value.status.date - a.value.status.date,
  };
  if (String(options.group) === 'mine') {
    queryOptions.mine = true;
  } else {
    queryOptions.groups = [String(options.group)];
  }
  if (String(options.status) !== 'any') {
    let statusCode = Status.getStatusCode(String(options.status));
    queryOptions.startkey = [statusCode];
    queryOptions.endkey = [statusCode];
  }
  let results = await roc.query('analysisRequestByKindAndStatus', queryOptions);
  results.forEach((result) => {
    result.color = Status.getStatusColor(Number(result.value.status.status));
  });
  API.createData('requests', results);
}

async function bulkChangeStatus(selected) {
  let newStatusObject = await askNewStatus();
  if (!newStatusObject) return;
  for (let requestToc of selected) {
    let request = await roc.document(String(requestToc.id));
    ensureStatus(request);
    await prependStatus(request, newStatusObject);
  }
}

function ensureStatus(request) {
  if (!request.$content) request.$content = {};
  if (!request.$content.status) request.$content.status = [];
}

async function askNewStatus(request) {
  const preferences = localStorage.getItem('eln-request-preferences');
  const { operator = '' } = preferences ? JSON.parse(preferences) : {};
  let currentStatusCode = '';
  if (request) {
    ensureStatus(request);
    let status = request.$content.status;
    currentStatusCode = status.length > 0 ? String(status[0].status) : '';
  }
  const statusArray = Status.getStatusArray();
  let currentStatus = -1;
  statusArray.forEach((item, i) => {
    if (String(currentStatusCode) === item.code) currentStatus = i;
  });
  if (currentStatus < statusArray.length - 1) {
    currentStatus++;
  }

  let newStatusObject = await UI.form(
    `   <style>
            #status {
                zoom: 1.5;
            }
        </style>
        <div id='status'>
            <b>Please select the new status and options</b>
            <p>&nbsp;</p>
            <form>
                <table>
                <tr><td>New status:</td><td><select name="status">
                    ${statusArray.map(
                      (item, i) =>
                        `<option value="${i}" ${
                          i === currentStatus ? 'selected' : ''
                        }>${item.description}</option>`,
                    )}
                </select></td></tr>
                <tr><td>Operator (email):</td><td><input type="text" name="operator" placeholder="Operator" value="${operator}"/></td></tr>
                <tr><td>Nb hours:</td><td><input type="number" name="hours" placeholder="Hours" /></td></tr>
                <tr><td>Comments:</td><td><textarea name="comments" placeholder="Comments" cols="40" rows="5"></textarea></td></tr>
                </table>
                <input type="submit" value="Submit"/>
            </form>
        </div>
    `,
    {},
    {
      dialog: {
        width: 500,
        height: 400,
        title: 'Change Request Status',
      },
    },
  );
  if (!newStatusObject) {
    return;
  }
  // we save the operator in the preferences
  localStorage.setItem(
    'eln-request-preferences',
    JSON.stringify({ operator: newStatusObject.operator }),
  );
  return {
    code: statusArray[newStatusObject.status].code,
    operator: newStatusObject.operator,
    hours: newStatusObject.hours,
    comments: newStatusObject.comments,
  };
}

async function prependStatus(request, newStatusObject) {
  const { code, ...meta } = newStatusObject;
  request.$content.status.unshift({
    ...meta,
    status: Number(code),
    date: Date.now(),
  });
  await roc.update(request);
}

async function createForm() {
  let groups = (await roc.getGroupMembership()).map((g) => g.name);
  let possibleGroups = ['mine'].concat(groups);
  let defaultGroup = window.localStorage.getItem('eln-default-sample-group');
  if (possibleGroups.indexOf(defaultGroup) === -1) {
    defaultGroup = 'all';
  }
  let possibleStatus = ['any'].concat(
    Status.getStatusArray().map((s) => s.description),
  );
  let schema = {
    type: 'object',
    properties: {
      group: {
        type: 'string',
        enum: possibleGroups,
        default: defaultGroup,
        required: true,
      },
      status: {
        type: 'string',
        enum: possibleStatus,
        default: '30',
        required: true,
      },
    },
  };
  API.createData('formSchema', schema);
}

export default processAction;
