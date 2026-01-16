"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.comment = void 0;
var _react = _interopRequireDefault(require("react"));
var _markdownUtils = require("../utils/markdownUtils");
var _jsxRuntime = require("react/jsx-runtime");
var comment = exports.comment = {
  name: 'comment',
  keyCommand: 'comment',
  shortcuts: 'ctrlcmd+/',
  prefix: '<!-- ',
  suffix: ' -->',
  buttonProps: {
    'aria-label': 'Insert comment (ctrl + /)',
    title: 'Insert comment (ctrl + /)'
  },
  icon: /*#__PURE__*/(0, _jsxRuntime.jsx)("svg", {
    height: "1em",
    width: "1em",
    viewBox: "0 0 25 25",
    children: /*#__PURE__*/(0, _jsxRuntime.jsxs)("g", {
      fill: "none",
      fillRule: "evenodd",
      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)("polygon", {
        points: ".769 .727 24.981 .727 24.981 24.727 .769 24.727"
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)("path", {
        stroke: "currentColor",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeWidth: "3",
        d: "M12.625,23.8787879 L8.125,19.6969697 L5.125,19.6969697 C2.63971863,19.6969697 0.625,17.8247059 0.625,15.5151515 L0.625,7.15151515 C0.625,4.84196074 2.63971863,2.96969697 5.125,2.96969697 L20.125,2.96969697 C22.6102814,2.96969697 24.625,4.84196074 24.625,7.15151515 L24.625,15.5151515 C24.625,17.8247059 22.6102814,19.6969697 20.125,19.6969697 L17.125,19.6969697 L12.625,23.8787879"
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)("path", {
        stroke: "currentColor",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeWidth: "3",
        d: "M10.625,8.54545455 L7.25,11.3333333 L10.625,14.1212121 M15.6875,8.54545455 L19.0625,11.3333333 L15.6875,14.1212121"
      })]
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
    (0, _markdownUtils.executeCommand)({
      api: api,
      selectedText: state1.selectedText,
      selection: state.selection,
      prefix: state.command.prefix,
      suffix: state.command.suffix
    });
  }
};