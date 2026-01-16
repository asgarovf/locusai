"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread2"));
var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));
var _react = _interopRequireWildcard(require("react"));
var _reactMarkdown = _interopRequireDefault(require("react-markdown"));
var _remarkGfm = _interopRequireDefault(require("remark-gfm"));
var _rehypeRaw = _interopRequireDefault(require("rehype-raw"));
var _remarkGithubBlockquoteAlert = require("remark-github-blockquote-alert");
var _useCopied = require("./plugins/useCopied");
var _jsxRuntime = require("react/jsx-runtime");
var _excluded = ["prefixCls", "className", "source", "style", "disableCopy", "skipHtml", "onScroll", "onMouseOver", "pluginsFilter", "rehypeRewrite", "wrapperElement", "warpperElement", "urlTransform"];
/**
 * https://github.com/uiwjs/react-md-editor/issues/607
 */
var defaultUrlTransform = function defaultUrlTransform(url) {
  return url;
};
var _default = exports["default"] = /*#__PURE__*/_react["default"].forwardRef(function (props, ref) {
  var _props$prefixCls = props.prefixCls,
    prefixCls = _props$prefixCls === void 0 ? 'wmde-markdown wmde-markdown-color' : _props$prefixCls,
    className = props.className,
    source = props.source,
    style = props.style,
    _props$disableCopy = props.disableCopy,
    disableCopy = _props$disableCopy === void 0 ? false : _props$disableCopy,
    _props$skipHtml = props.skipHtml,
    skipHtml = _props$skipHtml === void 0 ? true : _props$skipHtml,
    onScroll = props.onScroll,
    onMouseOver = props.onMouseOver,
    pluginsFilter = props.pluginsFilter,
    rewrite = props.rehypeRewrite,
    _props$wrapperElement = props.wrapperElement,
    wrapperElement = _props$wrapperElement === void 0 ? {} : _props$wrapperElement,
    _props$warpperElement = props.warpperElement,
    warpperElement = _props$warpperElement === void 0 ? {} : _props$warpperElement,
    urlTransform = props.urlTransform,
    other = (0, _objectWithoutProperties2["default"])(props, _excluded);
  var mdp = _react["default"].useRef(null);
  (0, _react.useImperativeHandle)(ref, function () {
    return (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, props), {}, {
      mdp: mdp
    });
  }, [mdp, props]);
  var cls = "".concat(prefixCls || '', " ").concat(className || '');
  (0, _useCopied.useCopied)(mdp);
  var rehypePlugins = (0, _toConsumableArray2["default"])(other.rehypePlugins || []);
  var customProps = {
    allowElement: function allowElement(element, index, parent) {
      if (other.allowElement) {
        return other.allowElement(element, index, parent);
      }
      return /^[A-Za-z0-9]+$/.test(element.tagName);
    }
  };
  if (!skipHtml) {
    rehypePlugins.push(_rehypeRaw["default"]);
  }
  var remarkPlugins = [_remarkGithubBlockquoteAlert.remarkAlert].concat((0, _toConsumableArray2["default"])(other.remarkPlugins || []), [_remarkGfm["default"]]);
  var wrapperProps = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, warpperElement), wrapperElement);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)("div", (0, _objectSpread2["default"])((0, _objectSpread2["default"])({
    ref: mdp,
    onScroll: onScroll,
    onMouseOver: onMouseOver
  }, wrapperProps), {}, {
    className: cls,
    style: style,
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactMarkdown["default"], (0, _objectSpread2["default"])((0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, customProps), other), {}, {
      skipHtml: !skipHtml,
      urlTransform: urlTransform || defaultUrlTransform,
      rehypePlugins: pluginsFilter ? pluginsFilter('rehype', rehypePlugins) : rehypePlugins,
      remarkPlugins: pluginsFilter ? pluginsFilter('remark', remarkPlugins) : remarkPlugins,
      children: source || ''
    }))
  }));
});
module.exports = exports.default;