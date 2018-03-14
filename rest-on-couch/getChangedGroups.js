define(['src/util/ui', 'lodash'], function (UI, _) {
    function editGroups(record, allGroups) {
        const allGroupNames = allGroups.map(group => group.name);
        const owners = DataObject.resurrect(record.$owners); // eslint-disable-line
        const canBeRemoved = _.intersection(allGroupNames, owners);
        const canBeAdded = _.difference(allGroupNames, owners);

        var entrysample = {group: {}};
        owners.forEach(group => (entrysample.group[group] = true));
        var data = {allGroups};
        return UI.form(
            `
    <div>
    <form>
        <table>
        <tr>
        <th>Groups</th>
        <td>
        {% for group in allGroups %}
          <div>
            <input type="checkbox" name="group.{{ group.name }}" />
            <span style="font-weight: bold;">{{group.name}}</span>
            <span>{{ group.description }}</span>
          </div>
        {% endfor %}
        </td>
        </tr>
        </table>
        <input type="submit" value="Submit"/>
    </form>
    </div>
`,
            entrysample,
            {twig: data}
        ).then(function (result) {
            if (!result) return null;
            const selected = Object.keys(result.group).filter(
                key => result.group[key]
            );
            const notSelected = Object.keys(result.group).filter(
                key => !result.group[key]
            );
            const toAdd = _.difference(canBeAdded, notSelected);
            const toRemove = _.difference(canBeRemoved, selected);
            return {
                add: toAdd,
                remove: toRemove
            };
        });
    }
    return editGroups;
});
