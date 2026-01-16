"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {};
exports["default"] = void 0;
var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread2"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _react = _interopRequireDefault(require("react"));
var _preview = _interopRequireDefault(require("./preview"));
var _rehypeRewrite = _interopRequireDefault(require("rehype-rewrite"));
var _rehypeAttr = _interopRequireDefault(require("rehype-attr"));
var _reservedMeta = require("./plugins/reservedMeta");
var _retrieveMeta = require("./plugins/retrieveMeta");
var _rehypePlugins = require("./rehypePlugins");
var _jsxRuntime = require("react/jsx-runtime");
var _Props = require("./Props");
Object.keys(_Props).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _Props[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _Props[key];
    }
  });
});
var _default = exports["default"] = /*#__PURE__*/_react["default"].forwardRef(function (props, ref) {
  var _props$disableCopy;
  var rehypePlugins = [_reservedMeta.reservedMeta, _retrieveMeta.retrieveMeta].concat((0, _toConsumableArray2["default"])(_rehypePlugins.defaultRehypePlugins), [[_rehypeRewrite["default"], {
    rewrite: (0, _rehypePlugins.rehypeRewriteHandle)((_props$disableCopy = props.disableCopy) !== null && _props$disableCopy !== void 0 ? _props$disableCopy : false, props.rehypeRewrite)
  }], [_rehypeAttr["default"], {
    properties: 'attr'
  }]], (0, _toConsumableArray2["default"])(props.rehypePlugins || []));
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_preview["default"], (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, props), {}, {
    rehypePlugins: rehypePlugins,
    ref: ref
  }));
});