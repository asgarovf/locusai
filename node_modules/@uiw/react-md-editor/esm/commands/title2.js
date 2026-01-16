import React from 'react';
import { headingExecute } from "../commands/title.js";
import { jsx as _jsx } from "react/jsx-runtime";
export var heading2 = {
  name: 'heading2',
  keyCommand: 'heading2',
  shortcuts: 'ctrlcmd+2',
  prefix: '## ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 2 (ctrl + 2)',
    title: 'Insert Heading 2 (ctrl + 2)'
  },
  icon: /*#__PURE__*/_jsx("div", {
    style: {
      fontSize: 16,
      textAlign: 'left'
    },
    children: "Heading 2"
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
 * @deprecated Use `heading2` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title2` for inserting Heading 2.
 */
export var title2 = heading2;