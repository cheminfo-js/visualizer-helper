import TypeRenderer from 'src/util/typerenderer';

import Color from './color';

export function add() {
  TypeRenderer.addType('reactionStatus', {
    toscreen($element, val) {
      let code = val.code || val;
      let label = val.label || Color.getLabel(code);
      let color = Color.getColor(code);
      $element.css('background-color', color);
      $element.html(label);
    },
  });
}
