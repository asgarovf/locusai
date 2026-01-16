"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.title6 = exports.heading6 = void 0;
var _react = _interopRequireDefault(require("react"));
var _title = require("../commands/title");
var _jsxRuntime = require("react/jsx-runtime");
var heading6 = exports.heading6 = {
  name: 'heading6',
  keyCommand: 'heading6',
  shortcuts: 'ctrlcmd+6',
  prefix: '###### ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 6 (ctrl + 6)',
    title: 'Insert Heading 6 (ctrl + 6)'
  },
  icon: /*#__PURE__*/(0, _jsxRuntime.jsx)("div", {
    style: {
      fontSize: 12,
      textAlign: 'left'
    },
    children: "Heading 6"
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
 * @deprecated Use `heading6` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title6` for inserting Heading 6.
 */
var title6 = exports.title6 = heading6;