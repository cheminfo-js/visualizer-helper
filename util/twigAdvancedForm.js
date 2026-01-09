/**
 * This code allows to create complex form in the twig module
 * You need in place modification
 *
 * In the twig templat eyou will have something like:
 *
 *  <script>
 *   require(['src/util/api'], function(API) {
 *       AdvancedForm('extendedForm', 'data', {debug:true});
 *   });
 *   </script>
 *   And the template will be like:
 *
 *   <table>
 *       <tr>
 *           <th></th><th></th>
 *           <th>Kind</th>
 *           <th>Firstname</th>
 *           <th>Lastname</th>
 *           <th>Affiliations</th>
 *       </tr>
 *       <tr data-repeat='creators'>
 *           <td>
 *               <select data-field='kind'>
 *                   <option value=''></option>
 *                   <option value='author'>Author</option>
 *                   <option value='editor'>Editor</option>
 *              </select>
 *           </td>
 *           <td>
 *               <input type='text' size=10 data-field='firstname'>
 *           </td>
 *           <td>
 *               <input type='text' size=10 data-field='lastname'>
 *           </td>
 *           <td>
 *               <table>
 *                    <tr data-repeat='affiliations'>
 *                       <td>
 *                           <input placeholder="Affiliation" type='text' size=10 data-field='name'>
 *                       </td>
 *                   </tr>
 *               </table>
 *           </td>
 *       </tr>
 *   </table>
 */

define(['jquery', 'src/util/api', 'modules/modulefactory'], (
  $,
  API,
  Module,
) => {
  function AdvancedForm(divID, options = {}) {
    // we will find automatically the variableName
    let moduleId = $(`#${divID}`)
      .closest('[data-module-id]')
      .attr('data-module-id');
    let module = Module.getModules().find(
      (m) => `${m.getId()}` === `${moduleId}`,
    );
    let ips = module.vars_in().filter((v) => v.rel === 'form');
    if (ips.length === 0) {
      throw new Error(
        'The twig module does not have variable in of type "form"',
      );
    }
    let variableName = ips[0].name;
    let data;
    let isUpdating = false; // Flag to prevent cascading updates

    // Configuration for single-item arrays (always use index 0)
    // Can be set via options.singleItemArrays or detected automatically
    let singleItemArrays = options.singleItemArrays || [];

    let variable = API.getVar(variableName);
    variable.listen(
      {
        getId() {
          return moduleId + variableName;
        },
      },
      (newData) => {
        newData.currentPromise.then(() => {
          if (!data) {
            data = API.getData(variableName);
            updateTwig();
          } else if (!isUpdating) {
            updateTwig();
          }
        });
      },
    );

    // we will initialise the form
    let dom = $(document.getElementById(divID));
    // Add the buttons ADD / REMOVE
    let rows = dom.find('[data-repeat]:not([class="form-button addRow"])');
    if (rows) {
      rows = rows.filter(function filterRows() {
        // eslint-disable-next-line no-invalid-this
        return !this.innerHTML.includes('form-button addRow');
      });
      rows.prepend(`
                  <td><span class="form-button addRow" /></td>
                  <td><span class="form-button removeRow" /></td>
              `);
    }

    if (!data && API.getData(variableName)) {
      data = API.getData(variableName);
      updateTwig();
    }

    // Add the style
    dom.parent().prepend(
      `<style>
                #${divID} .addRow {height: 14px;}
                #${divID} .addRow:before {content: "+"; cursor: pointer;}
                #${divID} .removeRow {height: 14px;}
                #${divID} .removeRow:before {content: "-"; cursor: pointer;}
                #${divID} :focus {box-shadow: 0 0 2px 2px rgba(81, 203, 238, 1);}
                #${divID} td, #extendedForm th {vertical-align: top;}
            </style>`,
    );

    function isSingleItemArray(dataRepeat, isNested) {
      if (!isNested) return false;

      if (singleItemArrays.includes(dataRepeat)) {
        return true;
      }

      let nestedTable = dom
        .find(`tr[data-repeat="${dataRepeat}"]`)
        .closest('table');
      if (nestedTable.attr('data-single-item') === 'true') {
        return true;
      }

      let repeatElement = dom.find(`tr[data-repeat="${dataRepeat}"]`);
      if (repeatElement.attr('data-single-item') === 'true') {
        return true;
      }

      return false;
    }

    function handleDataRepeat(index, row) {
      row = $(row);
      let jpath = getJpath(row);
      let variable = data ? data.getChildSync(jpath) : '';
      let table = row.closest('table');
      let length = 0;
      let empty = false;

      let isNested = row.closest('table').closest('[data-repeat]').length > 0;

      let dataRepeat = row.attr('data-repeat');
      let singleItem = isSingleItemArray(dataRepeat, isNested);

      if (!variable || variable.length === 0) {
        length = 1;
        empty = true;
      } else if (Array.isArray(variable)) {
        length = singleItem ? 1 : variable.length;
      } else {
        // eslint-disable-next-line no-console
        console.error('Wrong variable type', variable);
      }

      for (let i = 0; i < length; i++) {
        let currentRow;
        if (i === 0) {
          currentRow = row;
        } else {
          currentRow = row.clone();
          table.append(currentRow);
        }
        let actualIndex = singleItem ? 0 : i;
        currentRow.attr('data-index', actualIndex);
        renameRow(currentRow, jpath, actualIndex, empty);
      }
      rename(table);
    }

    // need to replicate rows based on the external variable
    function updateTwig() {
      let elements;
      do {
        elements = dom.find('[data-repeat]:not([data-index])');
        elements.each(handleDataRepeat);
      } while (elements.length > 0);

      // we force the incorporation of the data in the form
      if (data && module.view.formObject) {
        module.view.fillForm(true);
      }
    }

    // rename the attributes 'name' or 'name-empty' of one specific row based on the jpath
    function renameRow(row, jpath, rowIndex, empty) {
      row = $(row);
      row
        .children('td:not(:has(table))')
        .find('[data-field]')
        .each((index, element) => {
          element = $(element);
          let name = jpath.join('.');
          if (name) name += '.';
          name += rowIndex;
          let attr = element.attr('data-field');
          if (attr) name += `.${attr}`;
          if (empty) {
            element.attr('name-empty', name);
          } else {
            element.attr('name', name);
          }
        });
    }

    // get the jpath from one element based on the attributes 'data-repeat' and 'data-index'
    // the jpath is returned as an array
    function getJpath(element) {
      let jpath = [];
      while ($(element).length) {
        if ($(element).attr('data-index')) {
          jpath.unshift($(element).attr('data-index'));
        }
        let repeatName = $(element).attr('data-repeat');
        if (repeatName) jpath.unshift(...repeatName.split('.'));
        element = $(element).parent().closest('[data-repeat]');
      }
      return jpath;
    }

    /*
             Rename the the full table
             */
    function rename(tbody) {
      let base = getBase(tbody).base;
      let search = new RegExp(`${base}.[0-9]+`);
      let rows = tbody.children('tr:has(td)');

      let isNested = tbody.closest('[data-repeat]').length > 0;
      let dataRepeat = rows.first().attr('data-repeat');
      let singleItem = isSingleItemArray(dataRepeat, isNested);

      rows.each((rowIndex, row) => {
        let actualIndex = singleItem ? 0 : rowIndex;
        let replace = `${base}.${actualIndex}`;

        if (!singleItem) {
          $(row).attr('data-index', actualIndex);
        }

        for (let attr of ['name', 'name-empty']) {
          $(row)
            .find(`[${attr}]`)
            .each((index, element) => {
              element = $(element);
              let name = element.attr(attr);
              name = name.replace(search, replace);
              element.attr(attr, name);
            });
        }
      });
    }

    function getBase(element) {
      let tr = element.find('tr[data-repeat]').first();
      if (tr.length > 0) {
        let dataRepeat = tr.attr('data-repeat');
        let dataIndex = tr.attr('data-index') || '0';

        if (dataRepeat) {
          let base = dataRepeat;
          return {
            base,
            index: dataIndex,
          };
        }
      }

      let names = [];
      element.find('[name]').each((index, element) => {
        names.push($(element).attr('name'));
      });
      if (names.length === 0) {
        return '';
      }
      names.sort();
      return {
        base: names[0].replace(/(.*)\.([0-9]+).*/, '$1'),
        index: names[0].replace(/(.*)\.([0-9]+).*/, '$2'),
      };
    }

    function changeInputFct(event) {
      let target = $(event.target);
      if (target.attr('name-empty')) {
        let empties = target
          .closest('tr')
          .children('td:not(:has(table))')
          .find('[name-empty]');
        empties.each((index, element) => {
          $(element).attr('name', $(element).attr('name-empty'));
          $(element).removeAttr('name-empty');
        });
      }
    }
    // when the value of a row change we should rename property if it was hidden
    document.getElementById(divID).addEventListener('change', changeInputFct);
    document.getElementById(divID).addEventListener('input', changeInputFct);

    document.getElementById(divID).addEventListener('click', (event) => {
      // Prevent any clicks during updates
      if (isUpdating) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      let from = event.target;
      let table = $(from).closest('tbody');
      let tr = $(from).closest('tr');

      let isNested = table.closest('[data-repeat]').length > 0;
      let dataRepeat = tr.attr('data-repeat');
      let singleItem = isSingleItemArray(dataRepeat, isNested);

      let hasAddClass =
        $(from).hasClass('addRow') || $(from).hasClass('form-button addRow');
      let hasRemoveClass =
        $(from).hasClass('removeRow') ||
        $(from).hasClass('form-button removeRow');

      if (hasAddClass) {
        if (singleItem) {
          // eslint-disable-next-line no-console
          console.error(
            'Cannot add rows in single-item arrays - only one item allowed',
          );
          return;
        }

        let empties = table
          .children('tr')
          .children('td:not(:has(table))')
          .find('[name-empty]');
        if (empties.length > 0) {
          empties[0].focus();
          return;
        }
        let clone = tr.clone();
        clone.find('select, input, textarea').val('');
        clone.find('tr:not(:first-child)').remove();
        let fields = clone.find('[name]');
        // rename attribute 'name' to 'name-empty'
        fields.each((index, element) => {
          $(element).attr('name-empty', $(element).attr('name'));
          $(element).removeAttr('name');
        });
        table.append(clone);
        clone.find('[name-empty]')[0].focus();
        rename(table);
      } else if (hasRemoveClass) {
        if (singleItem) {
          tr.find('select, input, textarea').val('');
          return;
        }

        isUpdating = true;
        event.preventDefault();
        event.stopImmediatePropagation();

        dataRepeat = tr.attr('data-repeat');

        let dataRemoved = false;
        if (dataRepeat) {
          const data = API.getData(variableName);

          let fullJpath = getJpath(tr);

          if (fullJpath.length > 0) {
            let arrayPath = fullJpath.slice(0, -1);
            let itemIndex = parseInt(fullJpath[fullJpath.length - 1], 10);

            let arrayVariable = data.getChildSync(arrayPath);

            if (
              Array.isArray(arrayVariable) &&
              itemIndex >= 0 &&
              itemIndex < arrayVariable.length
            ) {
              arrayVariable.splice(itemIndex, 1);
              dataRemoved = true;
            }
          }
        }

        if (table.children('tr:has(td)').length > 1) {
          tr.remove();
        } else {
          tr.find('select, input, textarea').val('');
          tr.find('tr:not(:first-child)').remove();
          tr.find('[name]').each((index, element) => {
            $(element).attr('name-empty', $(element).attr('name'));
            $(element).removeAttr('name');
          });
          let firstEmpty = tr.find('[name-empty]')[0];
          if (firstEmpty) firstEmpty.focus();
        }
        rename(table);

        if (dataRemoved) {
          const data = API.getData(variableName);
          data.triggerChange();
        }

        setTimeout(() => {
          isUpdating = false;
        }, 500);
      }
    });
  }

  return AdvancedForm;
});
