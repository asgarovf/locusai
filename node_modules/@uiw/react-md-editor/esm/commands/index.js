import _extends from "@babel/runtime/helpers/extends";
import { insertTextAtPosition } from "../utils/InsertTextAtPosition.js";
import { bold } from "./bold.js";
import { code, codeBlock } from "./code.js";
import { comment } from "./comment.js";
import { divider } from "./divider.js";
import { fullscreen } from "./fullscreen.js";
import { group } from "./group.js";
import { hr } from "./hr.js";
import { image } from "./image.js";
import { italic } from "./italic.js";
import { link } from "./link.js";
import { checkedListCommand, orderedListCommand, unorderedListCommand } from "./list.js";
import { codeEdit, codeLive, codePreview } from "./preview.js";
import { quote } from "./quote.js";
import { strikethrough } from "./strikeThrough.js";
import { title, heading } from "./title.js";
import { title1, heading1 } from "./title1.js";
import { title2, heading2 } from "./title2.js";
import { title3, heading3 } from "./title3.js";
import { title4, heading4 } from "./title4.js";
import { title5, heading5 } from "./title5.js";
import { title6, heading6 } from "./title6.js";
import { table } from "./table.js";
import { issue } from "./issue.js";
import { help } from "./help.js";
var getCommands = () => [bold, italic, strikethrough, hr, group([title1, title2, title3, title4, title5, title6], {
  name: 'title',
  groupName: 'title',
  buttonProps: {
    'aria-label': 'Insert title',
    title: 'Insert title'
  }
}), divider, link, quote, code, codeBlock, comment, image, table, divider, unorderedListCommand, orderedListCommand, checkedListCommand, divider, help];
var getExtraCommands = () => [codeEdit, codeLive, codePreview, divider, fullscreen];
function getStateFromTextArea(textArea) {
  var _textArea$value;
  return {
    selection: {
      start: textArea.selectionStart,
      end: textArea.selectionEnd
    },
    text: textArea.value,
    selectedText: (_textArea$value = textArea.value) == null ? void 0 : _textArea$value.slice(textArea.selectionStart, textArea.selectionEnd)
  };
}
class TextAreaTextApi {
  constructor(textArea) {
    this.textArea = void 0;
    this.textArea = textArea;
  }

  /**
   * Replaces the current selection with the new text. This will make the new selectedText to be empty, the
   * selection start and selection end will be the same and will both point to the end
   * @param text Text that should replace the current selection
   */
  replaceSelection(text) {
    insertTextAtPosition(this.textArea, text);
    return getStateFromTextArea(this.textArea);
  }

  /**
   * Selects the specified text range
   * @param selection
   */
  setSelectionRange(selection) {
    this.textArea.focus();
    this.textArea.selectionStart = selection.start;
    this.textArea.selectionEnd = selection.end;
    return getStateFromTextArea(this.textArea);
  }
}
class TextAreaCommandOrchestrator {
  constructor(textArea) {
    this.textArea = void 0;
    this.textApi = void 0;
    this.textArea = textArea;
    this.textApi = new TextAreaTextApi(textArea);
  }
  getState() {
    if (!this.textArea) return false;
    return getStateFromTextArea(this.textArea);
  }
  executeCommand(command, dispatch, state, shortcuts) {
    command.execute && command.execute(_extends({
      command
    }, getStateFromTextArea(this.textArea)), this.textApi, dispatch, state, shortcuts);
  }
}
export { title, title1, title2, title3, title4, title5, title6, heading, heading1, heading2, heading3, heading4, heading5, heading6, bold, codeBlock, comment, italic, strikethrough, hr, group, divider, link, quote, code, image, unorderedListCommand, orderedListCommand, checkedListCommand, table, issue, help, codeEdit, codeLive, codePreview, fullscreen,
// Tool method.
getCommands, getExtraCommands, getStateFromTextArea, TextAreaCommandOrchestrator, TextAreaTextApi };