import _extends from "@babel/runtime/helpers/extends";
import slug from 'rehype-slug';
import headings from 'rehype-autolink-headings';
import rehypeIgnore from 'rehype-ignore';
import { getCodeString } from 'rehype-rewrite';
import { octiconLink } from "./nodes/octiconLink.js";
import { copyElement } from "./nodes/copy.js";
export var rehypeRewriteHandle = (disableCopy, rewrite) => (node, index, parent) => {
  if (node.type === 'element' && parent && parent.type === 'root' && /h(1|2|3|4|5|6)/.test(node.tagName)) {
    var child = node.children && node.children[0];
    if (child && child.properties && child.properties.ariaHidden === 'true') {
      child.properties = _extends({
        class: 'anchor'
      }, child.properties);
      child.children = [octiconLink];
    }
  }
  if (node.type === 'element' && node.tagName === 'pre' && !disableCopy) {
    var code = getCodeString(node.children);
    node.children.push(copyElement(code));
  }
  rewrite && rewrite(node, index === null ? undefined : index, parent === null ? undefined : parent);
};
export var defaultRehypePlugins = [slug, headings, rehypeIgnore];