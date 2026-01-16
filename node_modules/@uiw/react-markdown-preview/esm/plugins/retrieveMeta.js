import { visit } from 'unist-util-visit';
export var retrieveMeta = function retrieveMeta(options) {
  if (options === void 0) {
    options = {};
  }
  return tree => {
    visit(tree, node => {
      if (node.type === 'element' && node.tagName === 'code' && node.properties && node.properties['dataMeta']) {
        if (!node.data) {
          node.data = {};
        }
        var metaString = node.properties['dataMeta'];
        if (typeof metaString === 'string') {
          node.data.meta = metaString;
        }
        delete node.properties['dataMeta'];
      }
    });
  };
};