import TypeRenderer from 'src/util/typerenderer';


import { createTaxonomyTree } from '../../../../../../../../lib//mass-tools/7.8.0/mass-tools';
import * as TreeSVG from '../../../../../../../../lib/react-tree-svg/0.0.2/react-tree-svg';



export function add() {
  console.log(TreeSVG)
  TypeRenderer.addType('taxonomyTree', {


    toscreen($element, val, root, options = {}) {
      let taxonomies = val.code || val;
      const tree = createTaxonomyTree(taxonomies);
      const taxonomySVG = TreeSVG.render(tree, {
        nodeRenderer: 'taxonomy',
        rankDepthOptions: {
          maxRankDepth: options.maxRankDepth || 3,
        },
        positionOptions: {
          spacingHorizontal: 100,
        },
      });

      $element.html(taxonomySVG);
    },
  });
}
