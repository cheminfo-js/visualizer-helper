import UI from 'src/util/ui';

let html = `
    <style>
        #allGroups {
            width: 100%;
        }
        #allGroups thead, #allGroups tbody {
            display: block;
        }
        #allGroups tbody {
            height: 300px;
            overflow-y: auto;
        }
        #allGroups thead th:nth-child(1), #allGroups tbody td:nth-child(1) {
            width: 70px;
        }
        #allGroups thead th:nth-child(2), #allGroups tbody td:nth-child(2) {
            width: 250px;
            text-overflow:ellipsis;
        }
        #allGroups thead th:nth-child(3), #allGroups tbody td:nth-child(3) {
            width: 50px;
            text-overflow:ellipsis;
        }
    </style>
    <h1>How to enter a MF ?</h1>
    In a molecular formula it is possible to define multiple components, isotopes, 
    non natural isotopic abundance as well as to use groups and parenthesis.
    <ul>
        <li>isotopes will be place in brackets: eg: [13C], C[2H]Cl3
        <li>non natural abundance will be specified in curly brackets: eg: C{50,50}10 means that we have a ratio 50:50 between 12C and 13C
        <li>group abbreviation: you may use in molecular formula groups like Ala, Et, Ph, etc ...
        <li>multiple components should be separated by ' . '. eg. Et3N . HCl
        <li>hydrates on non-integer molecular formula may be specify with numbers in front on the MF. ex. CaSO4 . 1.5 H2O
        <li>parenthesis: any number of parenthesis may be used. eg. ((CH3)3C)3C6H3
    </ul>   
`;

module.exports = function showMfHelp() {
  UI.dialog(html, {
    width: 500,
    height: 400,
    title: 'HELP: entering a molecular formula'
  });
};
