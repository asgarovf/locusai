"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.comment = exports.codePreview = exports.codeLive = exports.codeEdit = exports.codeBlock = exports.code = exports.checkedListCommand = exports.bold = void 0;
Object.defineProperty(exports, "divider", {
  enumerable: true,
  get: function get() {
    return _divider.divider;
  }
});
exports.getExtraCommands = exports.getCommands = exports.fullscreen = void 0;
Object.defineProperty(exports, "group", {
  enumerable: true,
  get: function get() {
    return _group.group;
  }
});
exports.unorderedListCommand = exports.title6 = exports.title5 = exports.title4 = exports.title3 = exports.title2 = exports.title1 = exports.title = exports.table = exports.strikethrough = exports.quote = exports.orderedListCommand = exports.link = exports.italic = exports.issue = exports.image = exports.hr = exports.help = void 0;
var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread2"));
var _divider = require("./divider");
var _group = require("./group");
var _bold = require("./bold");
var _code = require("./code");
var _comment = require("./comment");
var _fullscreen = require("./fullscreen");
var _hr = require("./hr");
var _image = require("./image");
var _italic = require("./italic");
var _link = require("./link");
var _list = require("./list");
var _preview = require("./preview");
var _quote = require("./quote");
var _strikeThrough = require("./strikeThrough");
var _issue = require("./issue");
var _title = require("./title");
var _title2 = require("./title1");
var _title3 = require("./title2");
var _title4 = require("./title3");
var _title5 = require("./title4");
var _title6 = require("./title5");
var _title7 = require("./title6");
var _table = require("./table");
var _help = require("./help");
var bold = exports.bold = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _bold.bold), {}, {
  buttonProps: {
    'aria-label': '添加粗体文本(ctrl + b)',
    title: '添加粗体文本(ctrl + b)'
  }
});
var code = exports.code = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _code.code), {}, {
  buttonProps: {
    'aria-label': '插入代码(ctrl + j)',
    title: '插入代码(ctrl + j)'
  }
});
var codeBlock = exports.codeBlock = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _code.codeBlock), {}, {
  buttonProps: {
    'aria-label': '插入代码块(ctrl + shift + j)',
    title: '插入代码块(ctrl + shift + j)'
  }
});
var comment = exports.comment = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _comment.comment), {}, {
  buttonProps: {
    'aria-label': '插入注释(ctrl + /)',
    title: '插入注释(ctrl + /)'
  }
});
var fullscreen = exports.fullscreen = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _fullscreen.fullscreen), {}, {
  buttonProps: {
    'aria-label': '切换全屏(ctrl + 0)',
    title: '切换全屏(ctrl + 0)'
  }
});
var hr = exports.hr = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _hr.hr), {}, {
  buttonProps: {
    'aria-label': '插入分割线 (ctrl + h)',
    title: '插入分割线 (ctrl + h)'
  }
});
var image = exports.image = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _image.image), {}, {
  buttonProps: {
    'aria-label': '添加图像(ctrl + k)',
    title: '添加图像(ctrl + k)'
  }
});
var italic = exports.italic = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _italic.italic), {}, {
  buttonProps: {
    'aria-label': '添加斜体文本(ctrl + i)',
    title: '添加斜体文本(ctrl + i)'
  }
});
var link = exports.link = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _link.link), {}, {
  buttonProps: {
    'aria-label': '添加链接(ctrl + l)',
    title: '添加链接(ctrl + l)'
  }
});
var checkedListCommand = exports.checkedListCommand = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _list.checkedListCommand), {}, {
  buttonProps: {
    'aria-label': '添加检查列表(ctrl + shift + c)',
    title: '添加检查列表(ctrl + shift + c)'
  }
});
var orderedListCommand = exports.orderedListCommand = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _list.orderedListCommand), {}, {
  buttonProps: {
    'aria-label': '添加有序列表(ctrl + shift + o)',
    title: '添加有序列表(ctrl + shift + o)'
  }
});
var unorderedListCommand = exports.unorderedListCommand = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _list.unorderedListCommand), {}, {
  buttonProps: {
    'aria-label': '添加无序列表(ctrl + shift + u)',
    title: '添加无序列表(ctrl + shift + u)'
  }
});
var codeEdit = exports.codeEdit = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _preview.codeEdit), {}, {
  buttonProps: {
    'aria-label': '编辑代码(ctrl + 7)',
    title: '编辑代码(ctrl + 7)'
  }
});
var codeLive = exports.codeLive = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _preview.codeLive), {}, {
  buttonProps: {
    'aria-label': '实时代码(ctrl + 8)',
    title: '实时代码(ctrl + 8)'
  }
});
var codePreview = exports.codePreview = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _preview.codePreview), {}, {
  buttonProps: {
    'aria-label': '预览代码(ctrl + 9)',
    title: '预览代码(ctrl + 9)'
  }
});
var quote = exports.quote = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _quote.quote), {}, {
  buttonProps: {
    'aria-label': '预览代码(ctrl + 9)',
    title: '预览代码(ctrl + 9)'
  }
});
var strikethrough = exports.strikethrough = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _strikeThrough.strikethrough), {}, {
  buttonProps: {
    'aria-label': '添加删除线文本 (ctrl + shift + x)',
    title: '添加删除线文本 (ctrl + shift + x)'
  }
});
var issue = exports.issue = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _issue.issue), {}, {
  buttonProps: {
    'aria-label': '添加 issue',
    title: '添加 issue'
  }
});
var title = exports.title = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _title.title), {}, {
  buttonProps: {
    'aria-label': '插入 title (ctrl + 1)',
    title: '插入 title (ctrl + 1)'
  }
});
var title1 = exports.title1 = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _title2.title1), {}, {
  buttonProps: {
    'aria-label': '插入 title1 (ctrl + 1)',
    title: '插入 title1 (ctrl + 1)'
  }
});
var title2 = exports.title2 = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _title3.title2), {}, {
  buttonProps: {
    'aria-label': '插入 title2 (ctrl + 2)',
    title: '插入 title2 (ctrl + 2)'
  }
});
var title3 = exports.title3 = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _title4.title3), {}, {
  buttonProps: {
    'aria-label': '插入 title3 (ctrl + 3)',
    title: '插入 title3 (ctrl + 3)'
  }
});
var title4 = exports.title4 = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _title5.title4), {}, {
  buttonProps: {
    'aria-label': '插入 title4 (ctrl + 4)',
    title: '插入 title4 (ctrl + 4)'
  }
});
var title5 = exports.title5 = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _title6.title5), {}, {
  buttonProps: {
    'aria-label': '插入 title5 (ctrl + 5)',
    title: '插入 title5 (ctrl + 5)'
  }
});
var title6 = exports.title6 = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _title7.title6), {}, {
  buttonProps: {
    'aria-label': '插入 title6 (ctrl + 6)',
    title: '插入 title6 (ctrl + 6)'
  }
});
var table = exports.table = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _table.table), {}, {
  buttonProps: {
    'aria-label': '添加表格',
    title: '添加表格'
  }
});
var help = exports.help = (0, _objectSpread2["default"])((0, _objectSpread2["default"])({}, _help.help), {}, {
  buttonProps: {
    'aria-label': '打开帮助',
    title: '打开帮助'
  }
});
var getCommands = exports.getCommands = function getCommands() {
  return [bold, italic, strikethrough, hr, (0, _group.group)([title1, title2, title3, title4, title5, title6], {
    name: 'title',
    groupName: 'title',
    buttonProps: {
      'aria-label': '插入标题',
      title: 'I插入标题'
    }
  }), _divider.divider, link, quote, code, codeBlock, comment, image, table, _divider.divider, unorderedListCommand, orderedListCommand, checkedListCommand, _divider.divider, help];
};
var getExtraCommands = exports.getExtraCommands = function getExtraCommands() {
  return [codeEdit, codeLive, codePreview, _divider.divider, fullscreen];
};