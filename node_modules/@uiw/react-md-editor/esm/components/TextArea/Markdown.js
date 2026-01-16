import _taggedTemplateLiteralLoose from "@babel/runtime/helpers/taggedTemplateLiteralLoose";
var _templateObject;
import React, { useContext, useEffect } from 'react';
import { rehype } from 'rehype';
import rehypePrism from 'rehype-prism-plus';
import { EditorContext } from "../../Context.js";
import { jsx as _jsx } from "react/jsx-runtime";
function html2Escape(sHtml) {
  return sHtml
  // .replace(/```(\w+)?([\s\S]*?)(\s.+)?```/g, (str: string) => {
  //   return str.replace(
  //     /[<&"]/g,
  //     (c: string) => (({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' } as Record<string, string>)[c]),
  //   );
  // })
  .replace(/[<&"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;'
  })[c]);
}
export default function Markdown(props) {
  var {
    prefixCls
  } = props;
  var {
    markdown = '',
    highlightEnable,
    dispatch
  } = useContext(EditorContext);
  var preRef = /*#__PURE__*/React.createRef();
  useEffect(() => {
    if (preRef.current && dispatch) {
      dispatch({
        textareaPre: preRef.current
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!markdown) {
    return /*#__PURE__*/_jsx("pre", {
      ref: preRef,
      className: prefixCls + "-text-pre wmde-markdown-color"
    });
  }
  var mdStr = "<pre class=\"language-markdown " + prefixCls + "-text-pre wmde-markdown-color\"><code class=\"language-markdown\">" + html2Escape(String.raw(_templateObject || (_templateObject = _taggedTemplateLiteralLoose(["", ""])), markdown)) + "\n</code></pre>";
  if (highlightEnable) {
    try {
      mdStr = rehype().data('settings', {
        fragment: true
      })
      // https://github.com/uiwjs/react-md-editor/issues/593
      // @ts-ignore
      .use(rehypePrism, {
        ignoreMissing: true
      }).processSync(mdStr).toString();
    } catch (error) {}
  }
  return /*#__PURE__*/React.createElement('div', {
    className: 'wmde-markdown-color',
    dangerouslySetInnerHTML: {
      __html: mdStr || ''
    }
  });
}