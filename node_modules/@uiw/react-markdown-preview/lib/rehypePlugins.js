"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rehypeRewriteHandle = exports.defaultRehypePlugins = void 0;
var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread2"));
var _rehypeSlug = _interopRequireDefault(require("rehype-slug"));
var _rehypeAutolinkHeadings = _interopRequireDefault(require("rehype-autolink-headings"));
var _rehypeIgnore = _interopRequireDefault(require("rehype-ignore"));
var _rehypeRewrite = require("rehype-rewrite");
var _octiconLink = require("./nodes/octiconLink");
var _copy = require("./nodes/copy");
var rehypeRewriteHandle = exports.rehypeRewriteHandle = function rehypeRewriteHandle(disableCopy, rewrite) {
  return function (node, index, parent) {
    if (node.type === 'element' && parent && parent.type === 'root' && /h(1|2|3|4|5|6)/.test(node.tagName)) {
      var child = node.children && node.children[0];
      if (child && child.properties && child.properties.ariaHidden === 'true') {
        child.properties = (0, _objectSpread2["default"])({
          "class": 'anchor'
        }, child.properties);
        child.children = [_octiconLink.octiconLink];
      }
    }
    if (node.type === 'element' && node.tagName === 'pre' && !disableCopy) {
      var code = (0, _rehypeRewrite.getCodeString)(node.children);
      node.children.push((0, _copy.copyElement)(code));
    }
    rewrite && rewrite(node, index === null ? undefined : index, parent === null ? undefined : parent);
  };
};
var defaultRehypePlugins = exports.defaultRehypePlugins = [_rehypeSlug["default"], _rehypeAutolinkHeadings["default"], _rehypeIgnore["default"]];