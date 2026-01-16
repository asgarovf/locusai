"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.title5 = exports.heading5 = void 0;
var _react = _interopRequireDefault(require("react"));
var _title = require("../commands/title");
var _jsxRuntime = require("react/jsx-runtime");
var heading5 = exports.heading5 = {
  name: 'heading5',
  keyCommand: 'heading5',
  shortcuts: 'ctrlcmd+5',
  prefix: '##### ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 5 (ctrl + 5)',
    title: 'Insert Heading 5 (ctrl + 5)'
  },
  icon: /*#__PURE__*/(0, _jsxRuntime.jsx)("div", {
    style: {
      fontSize: 12,
      textAlign: 'left'
    },
    children: "Heading 5"
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
 * @deprecated Use `heading5` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title5` for inserting Heading 5.
 */
var title5 = exports.title5 = heading5;