import _extends from "@babel/runtime/helpers/extends";
import _objectWithoutPropertiesLoose from "@babel/runtime/helpers/objectWithoutPropertiesLoose";
var _excluded = ["prefixCls", "className", "value", "commands", "commandsFilter", "direction", "extraCommands", "height", "enableScroll", "visibleDragbar", "highlightEnable", "preview", "fullscreen", "overflow", "previewOptions", "textareaProps", "maxHeight", "minHeight", "autoFocus", "autoFocusEnd", "tabSize", "defaultTabEnable", "onChange", "onStatistics", "onHeightChange", "hideToolbar", "toolbarBottom", "components", "renderTextarea"];
import React, { useEffect, useReducer, useMemo, useRef, useImperativeHandle } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { ToolbarVisibility } from "./components/Toolbar/index.js";
import TextArea from "./components/TextArea/index.js";
import DragBar from "./components/DragBar/index.js";
import { getCommands, getExtraCommands, TextAreaCommandOrchestrator } from "./commands/index.js";
import { reducer, EditorContext } from "./Context.js";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function setGroupPopFalse(data) {
  if (data === void 0) {
    data = {};
  }
  Object.keys(data).forEach(keyname => {
    data[keyname] = false;
  });
  return data;
}
var InternalMDEditor = /*#__PURE__*/React.forwardRef((props, ref) => {
  var _ref = props || {},
    {
      prefixCls = 'w-md-editor',
      className,
      value: propsValue,
      commands = getCommands(),
      commandsFilter,
      direction,
      extraCommands = getExtraCommands(),
      height = 200,
      enableScroll = true,
      visibleDragbar = typeof props.visiableDragbar === 'boolean' ? props.visiableDragbar : true,
      highlightEnable = true,
      preview: previewType = 'live',
      fullscreen = false,
      overflow = true,
      previewOptions = {},
      textareaProps,
      maxHeight = 1200,
      minHeight = 100,
      autoFocus,
      autoFocusEnd = false,
      tabSize = 2,
      defaultTabEnable = false,
      onChange,
      onStatistics,
      onHeightChange,
      hideToolbar,
      toolbarBottom = false,
      components,
      renderTextarea
    } = _ref,
    other = _objectWithoutPropertiesLoose(_ref, _excluded);
  var cmds = commands.map(item => commandsFilter ? commandsFilter(item, false) : item).filter(Boolean);
  var extraCmds = extraCommands.map(item => commandsFilter ? commandsFilter(item, true) : item).filter(Boolean);
  var [state, dispatch] = useReducer(reducer, {
    markdown: propsValue,
    preview: previewType,
    components,
    height,
    minHeight,
    highlightEnable,
    tabSize,
    defaultTabEnable,
    scrollTop: 0,
    scrollTopPreview: 0,
    commands: cmds,
    extraCommands: extraCmds,
    fullscreen,
    barPopup: {}
  });
  var container = useRef(null);
  var previewRef = useRef(null);
  var enableScrollRef = useRef(enableScroll);
  useImperativeHandle(ref, () => _extends({}, state, {
    container: container.current,
    dispatch
  }));
  useMemo(() => enableScrollRef.current = enableScroll, [enableScroll]);
  useEffect(() => {
    var stateInit = {};
    if (container.current) {
      stateInit.container = container.current || undefined;
    }
    stateInit.markdown = propsValue || '';
    stateInit.barPopup = {};
    if (dispatch) {
      dispatch(_extends({}, state, stateInit));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  var cls = [className, 'wmde-markdown-var', direction ? prefixCls + "-" + direction : null, prefixCls, state.preview ? prefixCls + "-show-" + state.preview : null, state.fullscreen ? prefixCls + "-fullscreen" : null].filter(Boolean).join(' ').trim();
  useMemo(() => propsValue !== state.markdown && dispatch({
    markdown: propsValue || ''
  }), [propsValue, state.markdown]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => previewType !== state.preview && dispatch({
    preview: previewType
  }), [previewType]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => tabSize !== state.tabSize && dispatch({
    tabSize
  }), [tabSize]);
  useMemo(() => highlightEnable !== state.highlightEnable && dispatch({
    highlightEnable
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [highlightEnable]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => autoFocus !== state.autoFocus && dispatch({
    autoFocus: autoFocus
  }), [autoFocus]);
  useMemo(() => autoFocusEnd !== state.autoFocusEnd && dispatch({
    autoFocusEnd: autoFocusEnd
  }), [autoFocusEnd]);
  useMemo(() => fullscreen !== state.fullscreen && dispatch({
    fullscreen: fullscreen
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [fullscreen]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => height !== state.height && dispatch({
    height: height
  }), [height]);
  useMemo(() => height !== state.height && onHeightChange && onHeightChange(state.height, height, state), [height, onHeightChange, state]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => commands !== state.commands && dispatch({
    commands: cmds
  }), [props.commands]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => extraCommands !== state.extraCommands && dispatch({
    extraCommands: extraCmds
  }), [props.extraCommands]);
  var textareaDomRef = useRef();
  var active = useRef('preview');
  var initScroll = useRef(false);
  useMemo(() => {
    textareaDomRef.current = state.textareaWarp;
    if (state.textareaWarp) {
      state.textareaWarp.addEventListener('mouseover', () => {
        active.current = 'text';
      });
      state.textareaWarp.addEventListener('mouseleave', () => {
        active.current = 'preview';
      });
    }
  }, [state.textareaWarp]);
  var handleScroll = (e, type) => {
    if (!enableScrollRef.current) return;
    var textareaDom = textareaDomRef.current;
    var previewDom = previewRef.current ? previewRef.current : undefined;
    if (!initScroll.current) {
      active.current = type;
      initScroll.current = true;
    }
    if (textareaDom && previewDom) {
      var scale = (textareaDom.scrollHeight - textareaDom.offsetHeight) / (previewDom.scrollHeight - previewDom.offsetHeight);
      if (e.target === textareaDom && active.current === 'text') {
        previewDom.scrollTop = textareaDom.scrollTop / scale;
      }
      if (e.target === previewDom && active.current === 'preview') {
        textareaDom.scrollTop = previewDom.scrollTop * scale;
      }
      var scrollTop = 0;
      if (active.current === 'text') {
        scrollTop = textareaDom.scrollTop || 0;
      } else if (active.current === 'preview') {
        scrollTop = previewDom.scrollTop || 0;
      }
      dispatch({
        scrollTop
      });
    }
  };
  var previewClassName = prefixCls + "-preview " + (previewOptions.className || '');
  var handlePreviewScroll = e => handleScroll(e, 'preview');
  var mdPreview = useMemo(() => /*#__PURE__*/_jsx("div", {
    ref: previewRef,
    className: previewClassName,
    children: /*#__PURE__*/_jsx(MarkdownPreview, _extends({}, previewOptions, {
      onScroll: handlePreviewScroll,
      source: state.markdown || ''
    }))
  }), [previewClassName, previewOptions, state.markdown]);
  var preview = (components == null ? void 0 : components.preview) && (components == null ? void 0 : components.preview(state.markdown || '', state, dispatch));
  if (preview && /*#__PURE__*/React.isValidElement(preview)) {
    mdPreview = /*#__PURE__*/_jsx("div", {
      className: previewClassName,
      ref: previewRef,
      onScroll: handlePreviewScroll,
      children: preview
    });
  }
  var containerStyle = _extends({}, other.style, {
    height: state.height || '100%'
  });
  var containerClick = () => dispatch({
    barPopup: _extends({}, setGroupPopFalse(state.barPopup))
  });
  var dragBarChange = newHeight => dispatch({
    height: newHeight
  });
  var changeHandle = evn => {
    onChange && onChange(evn.target.value, evn, state);
    if (textareaProps && textareaProps.onChange) {
      textareaProps.onChange(evn);
    }
    if (state.textarea && state.textarea instanceof HTMLTextAreaElement && onStatistics) {
      var obj = new TextAreaCommandOrchestrator(state.textarea);
      var objState = obj.getState() || {};
      onStatistics(_extends({}, objState, {
        lineCount: evn.target.value.split('\n').length,
        length: evn.target.value.length
      }));
    }
  };
  return /*#__PURE__*/_jsx(EditorContext.Provider, {
    value: _extends({}, state, {
      dispatch
    }),
    children: /*#__PURE__*/_jsxs("div", _extends({
      ref: container,
      className: cls
    }, other, {
      onClick: containerClick,
      style: containerStyle,
      children: [/*#__PURE__*/_jsx(ToolbarVisibility, {
        hideToolbar: hideToolbar,
        toolbarBottom: toolbarBottom,
        prefixCls: prefixCls,
        overflow: overflow,
        placement: "top"
      }), /*#__PURE__*/_jsxs("div", {
        className: prefixCls + "-content",
        children: [/(edit|live)/.test(state.preview || '') && /*#__PURE__*/_jsx(TextArea, _extends({
          className: prefixCls + "-input",
          prefixCls: prefixCls,
          autoFocus: autoFocus
        }, textareaProps, {
          onChange: changeHandle,
          renderTextarea: (components == null ? void 0 : components.textarea) || renderTextarea,
          onScroll: e => handleScroll(e, 'text')
        })), /(live|preview)/.test(state.preview || '') && mdPreview]
      }), visibleDragbar && !state.fullscreen && /*#__PURE__*/_jsx(DragBar, {
        prefixCls: prefixCls,
        height: state.height,
        maxHeight: maxHeight,
        minHeight: minHeight,
        onChange: dragBarChange
      }), /*#__PURE__*/_jsx(ToolbarVisibility, {
        hideToolbar: hideToolbar,
        toolbarBottom: toolbarBottom,
        prefixCls: prefixCls,
        overflow: overflow,
        placement: "bottom"
      })]
    }))
  });
});
var Editor = InternalMDEditor;
Editor.Markdown = MarkdownPreview;
export default Editor;