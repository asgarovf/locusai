"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.title4 = exports.heading4 = void 0;
var _react = _interopRequireDefault(require("react"));
var _title = require("../commands/title");
var _jsxRuntime = require("react/jsx-runtime");
var heading4 = exports.heading4 = {
  name: 'heading4',
  keyCommand: 'heading4',
  shortcuts: 'ctrlcmd+4',
  prefix: '#### ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 4 (ctrl + 4)',
    title: 'Insert Heading 4 (ctrl + 4)'
  },
  icon: /*#__PURE__*/(0, _jsxRuntime.jsx)("div", {
    style: {
      fontSize: 14,
      textAlign: 'left'
    },
    children: "Heading 4"
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
 * @deprecated Use `heading4` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title4` for inserting Heading 4.
 */
var title4 = exports.title4 = heading4;