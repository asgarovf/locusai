import React from 'react';
import { headingExecute } from "../commands/title.js";
import { jsx as _jsx } from "react/jsx-runtime";
export var heading3 = {
  name: 'heading3',
  keyCommand: 'heading3',
  shortcuts: 'ctrlcmd+3',
  prefix: '### ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 3 (ctrl + 3)',
    title: 'Insert Heading 3 (ctrl + 3)'
  },
  icon: /*#__PURE__*/_jsx("div", {
    style: {
      fontSize: 15,
      textAlign: 'left'
    },
    children: "Heading 3"
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
 * @deprecated Use `heading3` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title3` for inserting Heading 3.
 */
export var title3 = heading3;