"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.help = void 0;
var _react = _interopRequireDefault(require("react"));
var _jsxRuntime = require("react/jsx-runtime");
var help = exports.help = {
  name: 'help',
  keyCommand: 'help',
  buttonProps: {
    'aria-label': 'Open help',
    title: 'Open help'
  },
  icon: /*#__PURE__*/(0, _jsxRuntime.jsx)("svg", {
    viewBox: "0 0 16 16",
    width: "12px",
    height: "12px",
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)("path", {
      d: "M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8Zm.9 13H7v-1.8h1.9V13Zm-.1-3.6v.5H7.1v-.6c.2-2.1 2-1.9 1.9-3.2.1-.7-.3-1.1-1-1.1-.8 0-1.2.7-1.2 1.6H5c0-1.7 1.2-3 2.9-3 2.3 0 3 1.4 3 2.3.1 2.3-1.9 2-2.1 3.5Z",
      fill: "currentColor"
    })
  }),
  execute: function execute() {
    window.open('https://www.markdownguide.org/basic-syntax/', '_blank', 'noreferrer');
  }
};