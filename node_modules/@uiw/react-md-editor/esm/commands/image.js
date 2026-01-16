import React from 'react';
import { selectWord, executeCommand } from "../utils/markdownUtils.js";
import { jsx as _jsx } from "react/jsx-runtime";
export var image = {
  name: 'image',
  keyCommand: 'image',
  shortcuts: 'ctrlcmd+k',
  prefix: '![image](',
  suffix: ')',
  buttonProps: {
    'aria-label': 'Add image (ctrl + k)',
    title: 'Add image (ctrl + k)'
  },
  icon: /*#__PURE__*/_jsx("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 20 20",
    children: /*#__PURE__*/_jsx("path", {
      fill: "currentColor",
      d: "M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
    })
  }),
  execute: (state, api) => {
    var newSelectionRange = selectWord({
      text: state.text,
      selection: state.selection,
      prefix: state.command.prefix,
      suffix: state.command.suffix
    });
    var state1 = api.setSelectionRange(newSelectionRange);
    if (state1.selectedText.includes('http') || state1.selectedText.includes('www')) {
      executeCommand({
        api,
        selectedText: state1.selectedText,
        selection: state.selection,
        prefix: state.command.prefix,
        suffix: state.command.suffix
      });
    } else {
      newSelectionRange = selectWord({
        text: state.text,
        selection: state.selection,
        prefix: '![',
        suffix: ']()'
      });
      state1 = api.setSelectionRange(newSelectionRange);
      if (state1.selectedText.length === 0) {
        executeCommand({
          api,
          selectedText: state1.selectedText,
          selection: state.selection,
          prefix: '![image',
          suffix: '](url)'
        });
      } else {
        executeCommand({
          api,
          selectedText: state1.selectedText,
          selection: state.selection,
          prefix: '![',
          suffix: ']()'
        });
      }
    }
  }
};