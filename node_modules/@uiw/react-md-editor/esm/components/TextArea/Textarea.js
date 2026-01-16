import _extends from "@babel/runtime/helpers/extends";
import _objectWithoutPropertiesLoose from "@babel/runtime/helpers/objectWithoutPropertiesLoose";
var _excluded = ["prefixCls", "onChange"],
  _excluded2 = ["markdown", "commands", "fullscreen", "preview", "highlightEnable", "extraCommands", "tabSize", "defaultTabEnable", "autoFocusEnd", "textareaWarp", "dispatch"];
import React, { useContext, useEffect } from 'react';
import { EditorContext } from "../../Context.js";
import { TextAreaCommandOrchestrator } from "../../commands/index.js";
import handleKeyDown from "./handleKeyDown.js";
import shortcuts from "./shortcuts.js";
import "./index.css";
import { jsx as _jsx } from "react/jsx-runtime";
export default function Textarea(props) {
  var {
      prefixCls,
      onChange: _onChange
    } = props,
    other = _objectWithoutPropertiesLoose(props, _excluded);
  var _useContext = useContext(EditorContext),
    {
      markdown,
      commands,
      fullscreen,
      preview,
      highlightEnable,
      extraCommands,
      tabSize,
      defaultTabEnable,
      autoFocusEnd,
      textareaWarp,
      dispatch
    } = _useContext,
    otherStore = _objectWithoutPropertiesLoose(_useContext, _excluded2);
  var textRef = React.useRef(null);
  var executeRef = React.useRef();
  var statesRef = React.useRef({
    fullscreen,
    preview
  });
  useEffect(() => {
    statesRef.current = {
      fullscreen,
      preview,
      highlightEnable
    };
  }, [fullscreen, preview, highlightEnable]);
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
  useEffect(() => {
    if (autoFocusEnd && textRef.current && textareaWarp) {
      textRef.current.focus();
      var length = textRef.current.value.length;
      textRef.current.setSelectionRange(length, length);
      setTimeout(() => {
        if (textareaWarp) {
          textareaWarp.scrollTop = textareaWarp.scrollHeight;
        }
        if (textRef.current) {
          textRef.current.scrollTop = textRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [textareaWarp]);
  var onKeyDown = e => {
    handleKeyDown(e, tabSize, defaultTabEnable);
    shortcuts(e, [...(commands || []), ...(extraCommands || [])], executeRef.current, dispatch, statesRef.current);
  };
  useEffect(() => {
    if (textRef.current) {
      textRef.current.addEventListener('keydown', onKeyDown);
    }
    return () => {
      if (textRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        textRef.current.removeEventListener('keydown', onKeyDown);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return /*#__PURE__*/_jsx("textarea", _extends({
    autoComplete: "off",
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: false
  }, other, {
    ref: textRef,
    className: prefixCls + "-text-input " + (other.className ? other.className : ''),
    value: markdown,
    onChange: e => {
      dispatch && dispatch({
        markdown: e.target.value
      });
      _onChange && _onChange(e);
    }
  }));
}