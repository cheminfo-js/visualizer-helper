/* eslint-disable no-console */

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

define(['jquery', 'src/util/api', 'modules/modulefactory'], function (
  $,
  API,
  Module,
) {
  console.log('START');

  function AdvancedForm(divID, options = {}) {
    // we will find automatically the variableName
    if (options.debug) console.log('CREATE ADVANCED FORM');

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

    if (options.debug) console.log('variableName:', variableName);
    if (options.debug) console.log('singleItemArrays:', singleItemArrays);

    let variable = API.getVar(variableName);
    variable.listen(
      {
        getId() {
          return moduleId + variableName;
        },
      },
      function (newData) {
        newData.currentPromise.then(() => {
          if (options.debug) console.log('receive newData', newData);
          if (!data) {
            if (options.debug) {
              console.log(
                'The variable',
                variableName,
                'does not exist yet. We will load it.',
              );
            }
            data = API.getData(variableName);
            updateTwig();
          } else if (!isUpdating) {
            if (options.debug) console.log('Data changed, updating twig...');
            updateTwig();
          }
        });
      },
    );

    // we will initialise the form
    let dom = $(document.getElementById(divID));
    if (options.debug) {
      console.log('Initialize the form');
    }
    // Add the buttons ADD / REMOVE
    let rows = dom.find('[data-repeat]:not([class="form-button addRow"])');
    if (rows) {
      rows = rows.filter(function () {
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
        console.log('Wrong variable type', variable);
      }

      for (let i = 0; i < length; i++) {
        var currentRow;
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
      if (options.debug) console.log('Update twig');

      do {
        var elements = dom.find('[data-repeat]:not([data-index])');
        elements.each(handleDataRepeat);
      } while (elements.length > 0);

      // we force the incorporation of the data in the form
      if (data && module.view.formObject) {
        if (options.debug) console.log('FORCE update data');
        module.view.fillForm(true);
      }
    }

    // rename the attributes 'name' or 'name-empty' of one specific row based on the jpath
    function renameRow(row, jpath, rowIndex, empty) {
      row = $(row);
      row
        .children('td:not(:has(table))')
        .find('[data-field]')
        .each(function (index, element) {
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

      rows.each(function (rowIndex, row) {
        let actualIndex = singleItem ? 0 : rowIndex;
        let replace = `${base}.${actualIndex}`;

        if (!singleItem) {
          $(row).attr('data-index', actualIndex);
        }

        for (var attr of ['name', 'name-empty']) {
          $(row)
            .find(`[${attr}]`)
            .each(
              // eslint-disable-next-line no-loop-func
              function (index, element) {
                element = $(element);
                let name = element.attr(attr);
                name = name.replace(search, replace);
                element.attr(attr, name);
              },
            );
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
          if (options.debug) {
            console.log('Using data-repeat as base:', base);
          }
          return {
            base,
            index: dataIndex,
          };
        }
      }

      let names = [];
      element.find('[name]').each(function (index, element) {
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

    if (options.debug) {
      document
        .getElementById(divID)
        .addEventListener('mouseover', function (event) {
          let target = $(event.target);
          if (target.attr('name')) {
            console.log('Name', target.attr('name'));
          }
        });
      document
        .getElementById(divID)
        .addEventListener('mouseover', function (event) {
          let target = $(event.target);
          if (target.attr('name-empty')) {
            console.log('Empty', target.attr('name-empty'));
          }
        });
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

    document.getElementById(divID).addEventListener('click', function (event) {
      // Prevent any clicks during updates
      if (isUpdating) {
        if (options.debug) console.log('Ignoring click during update');
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      let from = event.target;
      let table = $(from).closest('tbody');
      let tr = $(from).closest('tr');

      let isNested = table.closest('[data-repeat]').length > 0;
      var dataRepeat = tr.attr('data-repeat');
      let singleItem = isSingleItemArray(dataRepeat, isNested);

      let hasAddClass =
        $(from).hasClass('addRow') || $(from).hasClass('form-button addRow');
      let hasRemoveClass =
        $(from).hasClass('removeRow') ||
        $(from).hasClass('form-button removeRow');

      if (hasAddClass) {
        if (singleItem) {
          console.log(
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
          console.log(
            'Cannot remove rows in single-item arrays - one item must remain',
          );
          tr.find('select, input, textarea').val('');
          return;
        }

        isUpdating = true;
        event.preventDefault();
        event.stopImmediatePropagation();

        var dataRepeat = tr.attr('data-repeat');
        let currentRowIndex = 0;
        tr.prevAll(`tr[data-repeat="${  dataRepeat  }"]`).each(function () {
          currentRowIndex++;
        });

        if (options.debug) {
          console.log(
            'Removing row with data-repeat:',
            dataRepeat,
            'at current position:',
            currentRowIndex,
          );
        }

        let dataRemoved = false;
        if (dataRepeat) {
          var data = API.getData(variableName);

          let fullJpath = getJpath(tr);
          if (options.debug) {
            console.log('Full jpath for removal:', fullJpath);
          }

          if (fullJpath.length > 0) {
            let arrayPath = fullJpath.slice(0, -1);
            let itemIndex = parseInt(fullJpath[fullJpath.length - 1]);

            if (options.debug) {
              console.log(
                'Array path:',
                arrayPath,
                'Item index to remove:',
                itemIndex,
              );
            }

            let arrayVariable = data.getChildSync(arrayPath);

            if (
              Array.isArray(arrayVariable) &&
              itemIndex >= 0 &&
              itemIndex < arrayVariable.length
            ) {
              if (options.debug) {
                console.log(
                  'Array before removal:',
                  arrayVariable.length,
                  'items',
                );
                console.log(
                  'Removing item:',
                  JSON.stringify(arrayVariable[itemIndex]),
                );
              }
              arrayVariable.splice(itemIndex, 1);
              dataRemoved = true;
              if (options.debug) {
                console.log(
                  'Successfully removed item from array, now has:',
                  arrayVariable.length,
                  'items',
                );
              }
            } else if (options.debug) {
                console.log(
                  'Could not find array or invalid index:',
                  arrayVariable,
                  itemIndex,
                );
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
          var data = API.getData(variableName);
          data.triggerChange();
        }

        setTimeout(() => {
          isUpdating = false;
          if (options.debug) console.log('Reset updating flag');
        }, 500);
      }
    });
  }

  return AdvancedForm;
});
