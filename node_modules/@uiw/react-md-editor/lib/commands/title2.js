"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.title2 = exports.heading2 = void 0;
var _react = _interopRequireDefault(require("react"));
var _title = require("../commands/title");
var _jsxRuntime = require("react/jsx-runtime");
var heading2 = exports.heading2 = {
  name: 'heading2',
  keyCommand: 'heading2',
  shortcuts: 'ctrlcmd+2',
  prefix: '## ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 2 (ctrl + 2)',
    title: 'Insert Heading 2 (ctrl + 2)'
  },
  icon: /*#__PURE__*/(0, _jsxRuntime.jsx)("div", {
    style: {
      fontSize: 16,
      textAlign: 'left'
    },
    children: "Heading 2"
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
 * @deprecated Use `heading2` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title2` for inserting Heading 2.
 */
var title2 = exports.title2 = heading2;