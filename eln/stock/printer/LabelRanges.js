import numeral from 'numeral';

// some label formats can contain ranges that should be expanded
// you need a twig template to deal with the input form
// and a function to expand the ranges

const labelRangesTemplate = `
<style>
    #form, #form input, #form textarea {
        font-size: 1.4em;
    }
    #form tr {
        text-align: left;
    }
    #form th, #form td {
        vertical-align: top;
        padding: 6px;
    }
</style>

<div id="form">
    <table>
        {% for field in customFields %}
            <tr>
                <th>
                    {{field.label}}
                </th>
                <td>
                    {% if field.kind=="Text" %}
                        <input type="text" name="{{field.name}}" {{field.options}} style="width: 300px">
                    {% elseif field.kind=="Range" %}
                        From: <input value="1" placeholder="from" style="width: 70px" type="number" name="{{field.name}}_from"></input>
                        To: <input value="1"  placeholder="to" style="width: 70px" type="number" name="{{field.name}}_to"></input>
                        Format: <input value="00"  placeholder="format" style="width: 70px" type="text" name="{{field.name}}_format"></input>
                    {% elseif field.kind=="TextArea" %}
                        <textarea name="{{field.name}}" {{field.options}}></textarea>
                    {% endif %}
                </td>
            </tr>
        {% endfor %}
    </table>
</div>`;

/**
 * We will not only return all the values to print but also a preference object that allow
 * to previsualize the labels that should be printed.
 * This preference object should be used with an action like API.doAction('setLabelsColumns', modulePrefs);
 * @param {*} data
 */
function expandRanges(data) {
  data = JSON.parse(JSON.stringify(data));

  const toPrint = [];

  const ranges = {};
  const extensions = ['from', 'to', 'format'];
  for (let key in data) {
    let field;
    let value;
    for (let extension of extensions) {
      if (key.endsWith(`_${  extension}`)) {
        field = key.replace(/_.*?$/, '');
        if (!ranges[field]) ranges[field] = {};
        ranges[field][extension] = data[key];
      }
    }
  }
  if (Object.keys(ranges).length === 0) {
    ranges.labelNumber = { from: 1, to: 1 };
  }
  const fields = Object.keys(ranges);
  const froms = fields.map((field) => ranges[field].from);
  const currents = fields.map((field) => ranges[field].from);
  const tos = fields.map((field) => ranges[field].to);

  let position = fields.length - 1;
  while (position >= 0) {
    const datum = JSON.parse(JSON.stringify(data));
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (currents[i] === undefined || currents[i] === '') {
        datum[field] = '';
      } else {
        datum[field] = numeral(currents[i]).format(ranges[field].format);
      }
    }
    toPrint.push(datum);
    while (position >= 0) {
      if (currents[position] < tos[position]) {
        currents[position]++;
        break;
      } else {
        position--;
      }
    }
    if (position >= 0) {
      while (position < fields.length - 1) {
        position++;
        currents[position] = froms[position];
      }
    }
  }

  const cols = [];
  const columns = Object.keys(toPrint[0] || {});
  for (const column of columns) {
    if (!column.includes('_') && column !== 'labelNumber') {
      cols.push({
        name: column,
        jpath: [column],
        editor: 'none',
        formatter: 'typerenderer',
        copyFormatter: 'default',
        visibility: 'both',
        rendererOptions: '',
        editorOptions: '',
      });
    }
  }

  return { toPrint, modulePrefs: { cols } };
}

module.exports = {
  expandRanges,
  labelRangesTemplate,
};
