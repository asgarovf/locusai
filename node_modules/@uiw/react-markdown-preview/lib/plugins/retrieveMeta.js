"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.retrieveMeta = void 0;
var _unistUtilVisit = require("unist-util-visit");
var retrieveMeta = exports.retrieveMeta = function retrieveMeta() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return function (tree) {
    (0, _unistUtilVisit.visit)(tree, function (node) {
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