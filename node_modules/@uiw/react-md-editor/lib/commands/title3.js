"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.title3 = exports.heading3 = void 0;
var _react = _interopRequireDefault(require("react"));
var _title = require("../commands/title");
var _jsxRuntime = require("react/jsx-runtime");
var heading3 = exports.heading3 = {
  name: 'heading3',
  keyCommand: 'heading3',
  shortcuts: 'ctrlcmd+3',
  prefix: '### ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 3 (ctrl + 3)',
    title: 'Insert Heading 3 (ctrl + 3)'
  },
  icon: /*#__PURE__*/(0, _jsxRuntime.jsx)("div", {
    style: {
      fontSize: 15,
      textAlign: 'left'
    },
    children: "Heading 3"
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
 * @deprecated Use `heading3` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title3` for inserting Heading 3.
 */
var title3 = exports.title3 = heading3;