import _extends from "@babel/runtime/helpers/extends";
import React from 'react';
import rehypePrism from 'rehype-prism-plus';
import rehypeRewrite from 'rehype-rewrite';
import rehypeAttrs from 'rehype-attr';
import rehypeRaw from 'rehype-raw';
import MarkdownPreview from "./preview.js";
import { reservedMeta } from "./plugins/reservedMeta.js";
import { retrieveMeta } from "./plugins/retrieveMeta.js";
import { rehypeRewriteHandle, defaultRehypePlugins } from "./rehypePlugins.js";
import { jsx as _jsx } from "react/jsx-runtime";
export * from "./Props.js";
export default /*#__PURE__*/React.forwardRef((props, ref) => {
  var _props$disableCopy;
  var rehypePlugins = [reservedMeta, rehypeRaw, retrieveMeta, ...defaultRehypePlugins, [rehypeRewrite, {
    rewrite: rehypeRewriteHandle((_props$disableCopy = props.disableCopy) != null ? _props$disableCopy : false, props.rehypeRewrite)
  }], [rehypeAttrs, {
    properties: 'attr'
  }], ...(props.rehypePlugins || []), [rehypePrism, {
    ignoreMissing: true
  }]];
  return /*#__PURE__*/_jsx(MarkdownPreview, _extends({}, props, {
    rehypePlugins: rehypePlugins,
    ref: ref
  }));
});