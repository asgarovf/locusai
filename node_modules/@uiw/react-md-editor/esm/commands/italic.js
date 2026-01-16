import React from 'react';
import { selectWord, executeCommand } from "../utils/markdownUtils.js";
import { jsx as _jsx } from "react/jsx-runtime";
export var italic = {
  name: 'italic',
  keyCommand: 'italic',
  shortcuts: 'ctrlcmd+i',
  prefix: '*',
  buttonProps: {
    'aria-label': 'Add italic text (ctrl + i)',
    title: 'Add italic text (ctrl + i)'
  },
  icon: /*#__PURE__*/_jsx("svg", {
    "data-name": "italic",
    width: "12",
    height: "12",
    role: "img",
    viewBox: "0 0 320 512",
    children: /*#__PURE__*/_jsx("path", {
      fill: "currentColor",
      d: "M204.758 416h-33.849l62.092-320h40.725a16 16 0 0 0 15.704-12.937l6.242-32C297.599 41.184 290.034 32 279.968 32H120.235a16 16 0 0 0-15.704 12.937l-6.242 32C96.362 86.816 103.927 96 113.993 96h33.846l-62.09 320H46.278a16 16 0 0 0-15.704 12.935l-6.245 32C22.402 470.815 29.967 480 40.034 480h158.479a16 16 0 0 0 15.704-12.935l6.245-32c1.927-9.88-5.638-19.065-15.704-19.065z"
    })
  }),
  execute: (state, api) => {
    var newSelectionRange = selectWord({
      text: state.text,
      selection: state.selection,
      prefix: state.command.prefix
    });
    var state1 = api.setSelectionRange(newSelectionRange);
    executeCommand({
      api,
      selectedText: state1.selectedText,
      selection: state.selection,
      prefix: state.command.prefix
    });
  }
};