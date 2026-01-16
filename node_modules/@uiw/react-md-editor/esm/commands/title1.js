import React from 'react';
import { headingExecute } from "../commands/title.js";
import { jsx as _jsx } from "react/jsx-runtime";
export var heading1 = {
  name: 'heading1',
  keyCommand: 'heading1',
  shortcuts: 'ctrlcmd+1',
  prefix: '# ',
  suffix: '',
  buttonProps: {
    'aria-label': 'Insert Heading 1 (ctrl + 1)',
    title: 'Insert Heading 1 (ctrl + 1)'
  },
  icon: /*#__PURE__*/_jsx("div", {
    style: {
      fontSize: 18,
      textAlign: 'left'
    },
    children: "Heading 1"
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
 * @deprecated Use `heading1` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title1` for inserting Heading 1.
 */
export var title1 = heading1;