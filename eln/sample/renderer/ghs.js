import TypeRenderer from 'src/util/typerenderer';

export function add(GHS) {
  TypeRenderer.addType('ghsPictogram', {
    toscreen($element, val, root, options = {}) {
      const code = val.code || val;
      const svg = String(GHS.getGHSObject()[code].svg);
      const dom = $(svg);
      console.log(dom);
      const width = dom.attr('width');
      const height = dom.attr('height');
      if (width && height) {
        let viewbox = [0, 0, parseInt(width), parseInt(height)];
        dom[0].setAttribute('viewBox', viewbox.join(' '));
      }
      dom.removeAttr('id');
      dom.attr('width', '100%');
      dom.attr('height', '100%');
      dom.css('display', 'block');
      $element.html(dom);
    }
  });

  TypeRenderer.addType('ghsHStatement', {
    toscreen($element, val, root, options = {}) {
      const code = val.code || val;
      const label = String(GHS.getHStatementsObject()[code].statement);
      $element.html(label);
    }
  });
  TypeRenderer.addType('ghsPStatement', {
    toscreen($element, val, root, options = {}) {
      const code = val.code || val;
      const label = String(GHS.getPStatementsObject()[code].statement);
      $element.html(label);
    }
  });
}
