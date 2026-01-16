import React from 'react';
import { headingExecute } from "../commands/title.js";
import { jsx as _jsx } from "react/jsx-runtime";
export var heading4 = {
  name: 'heading4',
  keyCommand: 'heading4',
  shortcuts: 'ctrlcmd+4',
  prefix: '#### ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 4 (ctrl + 4)',
    title: 'Insert Heading 4 (ctrl + 4)'
  },
  icon: /*#__PURE__*/_jsx("div", {
    style: {
      fontSize: 14,
      textAlign: 'left'
    },
    children: "Heading 4"
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
 * @deprecated Use `heading4` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title4` for inserting Heading 4.
 */
export var title4 = heading4;