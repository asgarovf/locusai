"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.table = void 0;
var _react = _interopRequireDefault(require("react"));
var _markdownUtils = require("../utils/markdownUtils");
var _jsxRuntime = require("react/jsx-runtime");
var table = exports.table = {
  name: 'table',
  keyCommand: 'table',
  prefix: '\n| Header | Header |\n|--------|--------|\n| Cell | Cell |\n| Cell | Cell |\n| Cell | Cell |\n\n',
  suffix: '',
  buttonProps: {
    'aria-label': 'Add table',
    title: 'Add table'
  },
  icon: /*#__PURE__*/(0, _jsxRuntime.jsx)("svg", {
    role: "img",
    width: "12",
    height: "12",
    viewBox: "0 0 512 512",
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)("path", {
      fill: "currentColor",
      d: "M64 256V160H224v96H64zm0 64H224v96H64V320zm224 96V320H448v96H288zM448 256H288V160H448v96zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"
      //Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com
    })
  }),
  execute: function execute(state, api) {
    var newSelectionRange = (0, _markdownUtils.selectWord)({
      text: state.text,
      selection: state.selection,
      prefix: state.command.prefix,
      suffix: state.command.suffix
    });
    var state1 = api.setSelectionRange(newSelectionRange);
    if (state1.selectedText.length >= state.command.prefix.length + state.command.suffix.length && state1.selectedText.startsWith(state.command.prefix)) {
      // Remove
      (0, _markdownUtils.executeCommand)({
        api: api,
        selectedText: state1.selectedText,
        selection: state.selection,
        prefix: state.command.prefix,
        suffix: state.command.suffix
      });
    } else {
      // Add
      state1 = api.setSelectionRange({
        start: state.selection.start,
        end: state.selection.start
      });
      (0, _markdownUtils.executeCommand)({
        api: api,
        selectedText: state1.selectedText,
        selection: state.selection,
        prefix: state.command.prefix,
        suffix: state.command.suffix
      });
    }
  }
};