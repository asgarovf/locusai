import React from 'react';
import { headingExecute } from "../commands/title.js";
import { jsx as _jsx } from "react/jsx-runtime";
export var heading6 = {
  name: 'heading6',
  keyCommand: 'heading6',
  shortcuts: 'ctrlcmd+6',
  prefix: '###### ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 6 (ctrl + 6)',
    title: 'Insert Heading 6 (ctrl + 6)'
  },
  icon: /*#__PURE__*/_jsx("div", {
    style: {
      fontSize: 12,
      textAlign: 'left'
    },
    children: "Heading 6"
  }),
  execute: (state, api) => {
    headingExecute({
      state,
      api,
      prefix: state.command.prefix,
      suffix: state.command.suffix
    });
  }
};

/**
 * @deprecated Use `heading6` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title6` for inserting Heading 6.
 */
export var title6 = heading6;