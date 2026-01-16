"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.title1 = exports.heading1 = void 0;
var _react = _interopRequireDefault(require("react"));
var _title = require("../commands/title");
var _jsxRuntime = require("react/jsx-runtime");
var heading1 = exports.heading1 = {
  name: 'heading1',
  keyCommand: 'heading1',
  shortcuts: 'ctrlcmd+1',
  prefix: '# ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 1 (ctrl + 1)',
    title: 'Insert Heading 1 (ctrl + 1)'
  },
  icon: /*#__PURE__*/(0, _jsxRuntime.jsx)("div", {
    style: {
      fontSize: 18,
      textAlign: 'left'
    },
    children: "Heading 1"
  }),
  execute: function execute(state, api) {
    (0, _title.headingExecute)({
      state: state,
      api: api,
      prefix: state.command.prefix,
      suffix: state.command.suffix
    });
  }
};

/**
 * @deprecated Use `heading1` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title1` for inserting Heading 1.
 */
var title1 = exports.title1 = heading1;