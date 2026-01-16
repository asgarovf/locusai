import React from 'react';
import { headingExecute } from "../commands/title.js";
import { jsx as _jsx } from "react/jsx-runtime";
export var heading5 = {
  name: 'heading5',
  keyCommand: 'heading5',
  shortcuts: 'ctrlcmd+5',
  prefix: '##### ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 5 (ctrl + 5)',
    title: 'Insert Heading 5 (ctrl + 5)'
  },
  icon: /*#__PURE__*/_jsx("div", {
    style: {
      fontSize: 12,
      textAlign: 'left'
    },
    children: "Heading 5"
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
 * @deprecated Use `heading5` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title5` for inserting Heading 5.
 */
export var title5 = heading5;