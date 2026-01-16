import _extends from "@babel/runtime/helpers/extends";
import _objectWithoutPropertiesLoose from "@babel/runtime/helpers/objectWithoutPropertiesLoose";
var _excluded = ["prefixCls", "className", "onScroll", "renderTextarea"];
import React, { useEffect, Fragment, useContext } from 'react';
import { EditorContext } from "../../Context.js";
import shortcuts from "./shortcuts.js";
import Textarea from "./Textarea.js";
import { TextAreaCommandOrchestrator } from "../../commands/index.js";
import "./index.css";
import { jsx as _jsx } from "react/jsx-runtime";
export default function TextArea(props) {
  var _ref = props || {},
    {
      prefixCls,
      className,
      onScroll,
      renderTextarea
    } = _ref,
    otherProps = _objectWithoutPropertiesLoose(_ref, _excluded);
  var {
    markdown,
    scrollTop,
    commands,
    extraCommands,
    dispatch
  } = useContext(EditorContext);
  var textRef = React.useRef(null);
  var executeRef = React.useRef();
  var warp = /*#__PURE__*/React.createRef();
  useEffect(() => {
    var state = {};
    if (warp.current) {
      state.textareaWarp = warp.current || undefined;
      warp.current.scrollTop = scrollTop || 0;
    }
    if (dispatch) {
      dispatch(_extends({}, state));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (textRef.current && dispatch) {
      var commandOrchestrator = new TextAreaCommandOrchestrator(textRef.current);
      executeRef.current = commandOrchestrator;
      dispatch({
        textarea: textRef.current,
        commandOrchestrator
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  var textStyle = {
    WebkitTextFillColor: 'initial',
    overflow: 'auto'
  };
  return /*#__PURE__*/_jsx("div", {
    ref: warp,
    className: prefixCls + "-area " + (className || ''),
    onScroll: onScroll,
    children: /*#__PURE__*/_jsx("div", {
      className: prefixCls + "-text",
      children: renderTextarea ? (/*#__PURE__*/React.cloneElement(renderTextarea(_extends({}, otherProps, {
        value: markdown,
        autoComplete: 'off',
        autoCorrect: 'off',
        spellCheck: 'false',
        autoCapitalize: 'off',
        className: prefixCls + "-text-input",
        style: {
          WebkitTextFillColor: 'inherit',
          overflow: 'auto'
        }
      }), {
        dispatch,
        onChange: otherProps.onChange,
        shortcuts,
        useContext: {
          commands,
          extraCommands,
          commandOrchestrator: executeRef.current
        }
      }), {
        ref: textRef
      })) : /*#__PURE__*/_jsx(Fragment, {
        children: /*#__PURE__*/_jsx(Textarea, _extends({
          prefixCls: prefixCls
        }, otherProps, {
          style: textStyle
        }))
      })
    })
  });
}