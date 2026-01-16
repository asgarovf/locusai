import _extends from "@babel/runtime/helpers/extends";
import { divider } from "./divider.js";
import { group } from "./group.js";
import { bold as boldInit } from "./bold.js";
import { code as codeInit, codeBlock as codeBlockInit } from "./code.js";
import { comment as commentInit } from "./comment.js";
import { fullscreen as fullscreenInit } from "./fullscreen.js";
import { hr as hrInit } from "./hr.js";
import { image as imageInit } from "./image.js";
import { italic as italicInit } from "./italic.js";
import { link as linkInit } from "./link.js";
import { checkedListCommand as checkedListCommandInit, orderedListCommand as orderedListCommandInit, unorderedListCommand as unorderedListCommandInit } from "./list.js";
import { codeEdit as codeEditInit, codeLive as codeLiveInit, codePreview as codePreviewInit } from "./preview.js";
import { quote as quoteInit } from "./quote.js";
import { strikethrough as strikethroughInit } from "./strikeThrough.js";
import { issue as issueInit } from "./issue.js";
import { title as titleInit } from "./title.js";
import { title1 as title1Init } from "./title1.js";
import { title2 as title2Init } from "./title2.js";
import { title3 as title3Init } from "./title3.js";
import { title4 as title4Init } from "./title4.js";
import { title5 as title5Init } from "./title5.js";
import { title6 as title6Init } from "./title6.js";
import { table as tableInit } from "./table.js";
import { help as helpInit } from "./help.js";
var bold = _extends({}, boldInit, {
  buttonProps: {
    'aria-label': '添加粗体文本(ctrl + b)',
    title: '添加粗体文本(ctrl + b)'
  }
});
var code = _extends({}, codeInit, {
  buttonProps: {
    'aria-label': '插入代码(ctrl + j)',
    title: '插入代码(ctrl + j)'
  }
});
var codeBlock = _extends({}, codeBlockInit, {
  buttonProps: {
    'aria-label': '插入代码块(ctrl + shift + j)',
    title: '插入代码块(ctrl + shift + j)'
  }
});
var comment = _extends({}, commentInit, {
  buttonProps: {
    'aria-label': '插入注释(ctrl + /)',
    title: '插入注释(ctrl + /)'
  }
});
var fullscreen = _extends({}, fullscreenInit, {
  buttonProps: {
    'aria-label': '切换全屏(ctrl + 0)',
    title: '切换全屏(ctrl + 0)'
  }
});
var hr = _extends({}, hrInit, {
  buttonProps: {
    'aria-label': '插入分割线 (ctrl + h)',
    title: '插入分割线 (ctrl + h)'
  }
});
var image = _extends({}, imageInit, {
  buttonProps: {
    'aria-label': '添加图像(ctrl + k)',
    title: '添加图像(ctrl + k)'
  }
});
var italic = _extends({}, italicInit, {
  buttonProps: {
    'aria-label': '添加斜体文本(ctrl + i)',
    title: '添加斜体文本(ctrl + i)'
  }
});
var link = _extends({}, linkInit, {
  buttonProps: {
    'aria-label': '添加链接(ctrl + l)',
    title: '添加链接(ctrl + l)'
  }
});
var checkedListCommand = _extends({}, checkedListCommandInit, {
  buttonProps: {
    'aria-label': '添加检查列表(ctrl + shift + c)',
    title: '添加检查列表(ctrl + shift + c)'
  }
});
var orderedListCommand = _extends({}, orderedListCommandInit, {
  buttonProps: {
    'aria-label': '添加有序列表(ctrl + shift + o)',
    title: '添加有序列表(ctrl + shift + o)'
  }
});
var unorderedListCommand = _extends({}, unorderedListCommandInit, {
  buttonProps: {
    'aria-label': '添加无序列表(ctrl + shift + u)',
    title: '添加无序列表(ctrl + shift + u)'
  }
});
var codeEdit = _extends({}, codeEditInit, {
  buttonProps: {
    'aria-label': '编辑代码(ctrl + 7)',
    title: '编辑代码(ctrl + 7)'
  }
});
var codeLive = _extends({}, codeLiveInit, {
  buttonProps: {
    'aria-label': '实时代码(ctrl + 8)',
    title: '实时代码(ctrl + 8)'
  }
});
var codePreview = _extends({}, codePreviewInit, {
  buttonProps: {
    'aria-label': '预览代码(ctrl + 9)',
    title: '预览代码(ctrl + 9)'
  }
});
var quote = _extends({}, quoteInit, {
  buttonProps: {
    'aria-label': '预览代码(ctrl + 9)',
    title: '预览代码(ctrl + 9)'
  }
});
var strikethrough = _extends({}, strikethroughInit, {
  buttonProps: {
    'aria-label': '添加删除线文本 (ctrl + shift + x)',
    title: '添加删除线文本 (ctrl + shift + x)'
  }
});
var issue = _extends({}, issueInit, {
  buttonProps: {
    'aria-label': '添加 issue',
    title: '添加 issue'
  }
});
var title = _extends({}, titleInit, {
  buttonProps: {
    'aria-label': '插入 title (ctrl + 1)',
    title: '插入 title (ctrl + 1)'
  }
});
var title1 = _extends({}, title1Init, {
  buttonProps: {
    'aria-label': '插入 title1 (ctrl + 1)',
    title: '插入 title1 (ctrl + 1)'
  }
});
var title2 = _extends({}, title2Init, {
  buttonProps: {
    'aria-label': '插入 title2 (ctrl + 2)',
    title: '插入 title2 (ctrl + 2)'
  }
});
var title3 = _extends({}, title3Init, {
  buttonProps: {
    'aria-label': '插入 title3 (ctrl + 3)',
    title: '插入 title3 (ctrl + 3)'
  }
});
var title4 = _extends({}, title4Init, {
  buttonProps: {
    'aria-label': '插入 title4 (ctrl + 4)',
    title: '插入 title4 (ctrl + 4)'
  }
});
var title5 = _extends({}, title5Init, {
  buttonProps: {
    'aria-label': '插入 title5 (ctrl + 5)',
    title: '插入 title5 (ctrl + 5)'
  }
});
var title6 = _extends({}, title6Init, {
  buttonProps: {
    'aria-label': '插入 title6 (ctrl + 6)',
    title: '插入 title6 (ctrl + 6)'
  }
});
var table = _extends({}, tableInit, {
  buttonProps: {
    'aria-label': '添加表格',
    title: '添加表格'
  }
});
var help = _extends({}, helpInit, {
  buttonProps: {
    'aria-label': '打开帮助',
    title: '打开帮助'
  }
});
export var getCommands = () => [bold, italic, strikethrough, hr, group([title1, title2, title3, title4, title5, title6], {
  name: 'title',
  groupName: 'title',
  buttonProps: {
    'aria-label': '插入标题',
    title: 'I插入标题'
  }
}), divider, link, quote, code, codeBlock, comment, image, table, divider, unorderedListCommand, orderedListCommand, checkedListCommand, divider, help];
export var getExtraCommands = () => [codeEdit, codeLive, codePreview, divider, fullscreen];
export { title, title1, title2, title3, title4, title5, title6, bold, codeBlock, comment, italic, strikethrough, hr, group, divider, link, quote, code, image, unorderedListCommand, orderedListCommand, checkedListCommand, table, issue, help, codeEdit, codeLive, codePreview, fullscreen };