import _extends from "@babel/runtime/helpers/extends";
import React, { Fragment, useContext, useEffect, useRef } from 'react';
import { EditorContext } from "../../Context.js";
import Child from "./Child.js";
import "./index.css";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ToolbarItems(props) {
  var {
    prefixCls,
    overflow
  } = props;
  var {
    fullscreen,
    preview,
    barPopup = {},
    components,
    commandOrchestrator,
    dispatch
  } = useContext(EditorContext);
  var originalOverflow = useRef('');
  function handleClick(command, name) {
    if (!dispatch) return;
    var state = {
      barPopup: _extends({}, barPopup)
    };
    if (command.keyCommand === 'preview') {
      state.preview = command.value;
    }
    if (command.keyCommand === 'fullscreen') {
      state.fullscreen = !fullscreen;
    }
    if (props.commands && command.keyCommand === 'group') {
      props.commands.forEach(item => {
        if (name === item.groupName) {
          state.barPopup[name] = true;
        } else if (item.keyCommand) {
          state.barPopup[item.groupName] = false;
        }
      });
    } else if (name || command.parent) {
      Object.keys(state.barPopup || {}).forEach(keyName => {
        state.barPopup[keyName] = false;
      });
    }
    if (Object.keys(state).length) {
      dispatch(_extends({}, state));
    }
    commandOrchestrator && commandOrchestrator.executeCommand(command);
  }
  useEffect(() => {
    if (document && overflow) {
      if (fullscreen) {
        // prevent scroll on fullscreen
        document.body.style.overflow = 'hidden';
      } else {
        // get the original overflow only the first time
        if (!originalOverflow.current) {
          originalOverflow.current = window.getComputedStyle(document.body, null).overflow;
        }
        // reset to the original overflow
        document.body.style.overflow = originalOverflow.current;
      }
    }
  }, [fullscreen, originalOverflow, overflow]);
  return /*#__PURE__*/_jsx("ul", {
    children: (props.commands || []).map((item, idx) => {
      if (item.keyCommand === 'divider') {
        return /*#__PURE__*/_jsx("li", _extends({}, item.liProps, {
          className: prefixCls + "-toolbar-divider"
        }), idx);
      }
      if (!item.keyCommand) return /*#__PURE__*/_jsx(Fragment, {}, idx);
      var activeBtn = fullscreen && item.keyCommand === 'fullscreen' || item.keyCommand === 'preview' && preview === item.value;
      var childNode = item.children && typeof item.children === 'function' ? item.children({
        getState: () => commandOrchestrator.getState(),
        textApi: commandOrchestrator ? commandOrchestrator.textApi : undefined,
        close: () => handleClick({}, item.groupName),
        execute: () => handleClick({
          execute: item.execute
        }),
        dispatch
      }) : undefined;
      var disabled = barPopup && preview && preview === 'preview' && !/(preview|fullscreen)/.test(item.keyCommand);
      var render = (components == null ? void 0 : components.toolbar) || item.render;
      var com = render && typeof render === 'function' ? render(item, !!disabled, handleClick, idx) : null;
      return /*#__PURE__*/_jsxs("li", _extends({}, item.liProps, {
        className: activeBtn ? "active" : '',
        children: [com && /*#__PURE__*/React.isValidElement(com) && com, !com && !item.buttonProps && item.icon, !com && item.buttonProps && /*#__PURE__*/React.createElement('button', _extends({
          type: 'button',
          key: idx,
          disabled,
          'data-name': item.name
        }, item.buttonProps, {
          onClick: evn => {
            evn.stopPropagation();
            handleClick(item, item.groupName);
          }
        }), item.icon), item.children && /*#__PURE__*/_jsx(Child, {
          overflow: overflow,
          groupName: item.groupName,
          prefixCls: prefixCls,
          children: childNode,
          commands: Array.isArray(item.children) ? item.children : undefined
        })]
      }), idx);
    })
  });
}
export default function Toolbar(props) {
  if (props === void 0) {
    props = {};
  }
  var {
    prefixCls,
    isChild,
    className
  } = props;
  var {
    commands,
    extraCommands
  } = useContext(EditorContext);
  return /*#__PURE__*/_jsxs("div", {
    className: prefixCls + "-toolbar " + className,
    children: [/*#__PURE__*/_jsx(ToolbarItems, _extends({}, props, {
      commands: props.commands || commands || []
    })), !isChild && /*#__PURE__*/_jsx(ToolbarItems, _extends({}, props, {
      commands: extraCommands || []
    }))]
  });
}
export function ToolbarVisibility(props) {
  var {
    hideToolbar,
    toolbarBottom,
    placement,
    overflow,
    prefixCls
  } = props;
  if (hideToolbar || placement === 'bottom' && !toolbarBottom || placement === 'top' && toolbarBottom) {
    return null;
  }
  var cls = toolbarBottom ? 'bottom' : '';
  return /*#__PURE__*/_jsx(Toolbar, {
    prefixCls: prefixCls,
    overflow: overflow,
    className: cls
  });
}