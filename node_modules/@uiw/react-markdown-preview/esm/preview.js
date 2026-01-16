import _extends from "@babel/runtime/helpers/extends";
import _objectWithoutPropertiesLoose from "@babel/runtime/helpers/objectWithoutPropertiesLoose";
var _excluded = ["prefixCls", "className", "source", "style", "disableCopy", "skipHtml", "onScroll", "onMouseOver", "pluginsFilter", "rehypeRewrite", "wrapperElement", "warpperElement", "urlTransform"];
import React, { useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import raw from 'rehype-raw';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { useCopied } from "./plugins/useCopied.js";
import "./styles/markdown.css";

/**
 * https://github.com/uiwjs/react-md-editor/issues/607
 */
import { jsx as _jsx } from "react/jsx-runtime";
var defaultUrlTransform = url => url;
export default /*#__PURE__*/React.forwardRef((props, ref) => {
  var {
      prefixCls = 'wmde-markdown wmde-markdown-color',
      className,
      source,
      style,
      disableCopy = false,
      skipHtml = true,
      onScroll,
      onMouseOver,
      pluginsFilter,
      wrapperElement = {},
      warpperElement = {},
      urlTransform
    } = props,
    other = _objectWithoutPropertiesLoose(props, _excluded);
  var mdp = React.useRef(null);
  useImperativeHandle(ref, () => _extends({}, props, {
    mdp
  }), [mdp, props]);
  var cls = (prefixCls || '') + " " + (className || '');
  useCopied(mdp);
  var rehypePlugins = [...(other.rehypePlugins || [])];
  var customProps = {
    allowElement: (element, index, parent) => {
      if (other.allowElement) {
        return other.allowElement(element, index, parent);
      }
      return /^[A-Za-z0-9]+$/.test(element.tagName);
    }
  };
  if (!skipHtml) {
    rehypePlugins.push(raw);
  }
  var remarkPlugins = [remarkAlert, ...(other.remarkPlugins || []), gfm];
  var wrapperProps = _extends({}, warpperElement, wrapperElement);
  return /*#__PURE__*/_jsx("div", _extends({
    ref: mdp,
    onScroll: onScroll,
    onMouseOver: onMouseOver
  }, wrapperProps, {
    className: cls,
    style: style,
    children: /*#__PURE__*/_jsx(ReactMarkdown, _extends({}, customProps, other, {
      skipHtml: !skipHtml,
      urlTransform: urlTransform || defaultUrlTransform,
      rehypePlugins: pluginsFilter ? pluginsFilter('rehype', rehypePlugins) : rehypePlugins,
      remarkPlugins: pluginsFilter ? pluginsFilter('remark', remarkPlugins) : remarkPlugins,
      children: source || ''
    }))
  }));
});