import _extends from "@babel/runtime/helpers/extends";
import React, { useContext, useMemo } from 'react';
import "./Child.css";
import Toolbar from "./index.js";
import { EditorContext } from "../../Context.js";
import { jsx as _jsx } from "react/jsx-runtime";
export default function Child(props) {
  var {
    prefixCls,
    groupName,
    commands,
    children
  } = props || {};
  var {
    barPopup = {}
  } = useContext(EditorContext);
  return useMemo(() => /*#__PURE__*/_jsx("div", {
    className: prefixCls + "-toolbar-child " + (groupName && barPopup[groupName] ? 'active' : ''),
    onClick: e => e.stopPropagation(),
    children: Array.isArray(commands) ? /*#__PURE__*/_jsx(Toolbar, _extends({
      commands: commands
    }, props, {
      isChild: true
    })) : children
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [commands, barPopup, groupName, prefixCls]);
}