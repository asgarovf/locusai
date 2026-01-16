"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  commands: true,
  MarkdownUtil: true,
  headingExecute: true,
  handleKeyDown: true,
  shortcuts: true
};
exports["default"] = exports.commands = exports.MarkdownUtil = void 0;
Object.defineProperty(exports, "handleKeyDown", {
  enumerable: true,
  get: function get() {
    return _handleKeyDown["default"];
  }
});
Object.defineProperty(exports, "headingExecute", {
  enumerable: true,
  get: function get() {
    return _title.headingExecute;
  }
});
Object.defineProperty(exports, "shortcuts", {
  enumerable: true,
  get: function get() {
    return _shortcuts["default"];
  }
});
var _Editor = _interopRequireWildcard(require("./Editor.nohighlight"));
Object.keys(_Editor).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _Editor[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _Editor[key];
    }
  });
});
var commands = _interopRequireWildcard(require("./commands/"));
exports.commands = commands;
Object.keys(commands).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === commands[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return commands[key];
    }
  });
});
var MarkdownUtil = _interopRequireWildcard(require("./utils/markdownUtils"));
exports.MarkdownUtil = MarkdownUtil;
Object.keys(MarkdownUtil).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === MarkdownUtil[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return MarkdownUtil[key];
    }
  });
});
var _title = require("./commands/title");
var _group = require("./commands/group");
Object.keys(_group).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _group[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _group[key];
    }
  });
});
var _InsertTextAtPosition = require("./utils/InsertTextAtPosition");
Object.keys(_InsertTextAtPosition).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _InsertTextAtPosition[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _InsertTextAtPosition[key];
    }
  });
});
var _Context = require("./Context");
Object.keys(_Context).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _Context[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _Context[key];
    }
  });
});
var _Types = require("./Types");
Object.keys(_Types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _Types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _Types[key];
    }
  });
});
var _handleKeyDown = _interopRequireDefault(require("./components/TextArea/handleKeyDown"));
var _shortcuts = _interopRequireDefault(require("./components/TextArea/shortcuts"));
var _default = exports["default"] = _Editor["default"];