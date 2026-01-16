"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = Markdown;
var _taggedTemplateLiteral2 = _interopRequireDefault(require("@babel/runtime/helpers/taggedTemplateLiteral"));
var _react = _interopRequireWildcard(require("react"));
var _rehype = require("rehype");
var _rehypePrismPlus = _interopRequireDefault(require("rehype-prism-plus"));
var _Context = require("../../Context");
var _jsxRuntime = require("react/jsx-runtime");
var _templateObject;
function html2Escape(sHtml) {
  return sHtml
  // .replace(/```(\w+)?([\s\S]*?)(\s.+)?```/g, (str: string) => {
  //   return str.replace(
  //     /[<&"]/g,
  //     (c: string) => (({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' } as Record<string, string>)[c]),
  //   );
  // })
  .replace(/[<&"]/g, function (c) {
    return {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;'
    }[c];
  });
}
function Markdown(props) {
  var prefixCls = props.prefixCls;
  var _useContext = (0, _react.useContext)(_Context.EditorContext),
    _useContext$markdown = _useContext.markdown,
    markdown = _useContext$markdown === void 0 ? '' : _useContext$markdown,
    highlightEnable = _useContext.highlightEnable,
    dispatch = _useContext.dispatch;
  var preRef = /*#__PURE__*/_react["default"].createRef();
  (0, _react.useEffect)(function () {
    if (preRef.current && dispatch) {
      dispatch({
        textareaPre: preRef.current
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!markdown) {
    return /*#__PURE__*/(0, _jsxRuntime.jsx)("pre", {
      ref: preRef,
      className: "".concat(prefixCls, "-text-pre wmde-markdown-color")
    });
  }
  var mdStr = "<pre class=\"language-markdown ".concat(prefixCls, "-text-pre wmde-markdown-color\"><code class=\"language-markdown\">").concat(html2Escape(String.raw(_templateObject || (_templateObject = (0, _taggedTemplateLiteral2["default"])(["", ""])), markdown)), "\n</code></pre>");
  if (highlightEnable) {
    try {
      mdStr = (0, _rehype.rehype)().data('settings', {
        fragment: true
      })
      // https://github.com/uiwjs/react-md-editor/issues/593
      // @ts-ignore
      .use(_rehypePrismPlus["default"], {
        ignoreMissing: true
      }).processSync(mdStr).toString();
    } catch (error) {}
  }
  return /*#__PURE__*/_react["default"].createElement('div', {
    className: 'wmde-markdown-color',
    dangerouslySetInnerHTML: {
      __html: mdStr || ''
    }
  });
}
module.exports = exports.default;