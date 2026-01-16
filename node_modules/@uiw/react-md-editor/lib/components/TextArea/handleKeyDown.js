"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = handleKeyDown;
var _InsertTextAtPosition = require("../../utils/InsertTextAtPosition");
var _markdownUtils = require("../../utils/markdownUtils");
var _commands = require("../../commands/");
/**
 * - `13` - `Enter`
 * - `9` - `Tab`
 */
function stopPropagation(e) {
  e.stopPropagation();
  e.preventDefault();
}
function handleLineMove(e, direction) {
  stopPropagation(e);
  var target = e.target;
  var textArea = new _commands.TextAreaTextApi(target);
  var selection = {
    start: target.selectionStart,
    end: target.selectionEnd
  };
  selection = (0, _markdownUtils.selectLine)({
    text: target.value,
    selection: selection
  });
  if (direction < 0 && selection.start <= 0 || direction > 0 && selection.end >= target.value.length) {
    return;
  }
  var blockText = target.value.slice(selection.start, selection.end);
  if (direction < 0) {
    var prevLineSelection = (0, _markdownUtils.selectLine)({
      text: target.value,
      selection: {
        start: selection.start - 1,
        end: selection.start - 1
      }
    });
    var prevLineText = target.value.slice(prevLineSelection.start, prevLineSelection.end);
    textArea.setSelectionRange({
      start: prevLineSelection.start,
      end: selection.end
    });
    (0, _InsertTextAtPosition.insertTextAtPosition)(target, "".concat(blockText, "\n").concat(prevLineText));
    textArea.setSelectionRange({
      start: prevLineSelection.start,
      end: prevLineSelection.start + blockText.length
    });
  } else {
    var nextLineSelection = (0, _markdownUtils.selectLine)({
      text: target.value,
      selection: {
        start: selection.end + 1,
        end: selection.end + 1
      }
    });
    var nextLineText = target.value.slice(nextLineSelection.start, nextLineSelection.end);
    textArea.setSelectionRange({
      start: selection.start,
      end: nextLineSelection.end
    });
    (0, _InsertTextAtPosition.insertTextAtPosition)(target, "".concat(nextLineText, "\n").concat(blockText));
    textArea.setSelectionRange({
      start: nextLineSelection.end - blockText.length,
      end: nextLineSelection.end
    });
  }
}
function handleKeyDown(e) {
  var tabSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
  var defaultTabEnable = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var target = e.target;
  var starVal = target.value.substr(0, target.selectionStart);
  var valArr = starVal.split('\n');
  var currentLineStr = valArr[valArr.length - 1];
  var textArea = new _commands.TextAreaTextApi(target);

  /**
   * `9` - `Tab`
   */
  if (!defaultTabEnable && e.code && e.code.toLowerCase() === 'tab') {
    stopPropagation(e);
    var space = new Array(tabSize + 1).join('  ');
    if (target.selectionStart !== target.selectionEnd) {
      var _star = target.value.substring(0, target.selectionStart).split('\n');
      var _end = target.value.substring(0, target.selectionEnd).split('\n');
      var modifiedTextLine = [];
      _end.forEach(function (item, idx) {
        if (item !== _star[idx]) {
          modifiedTextLine.push(item);
        }
      });
      var modifiedText = modifiedTextLine.join('\n');
      var oldSelectText = target.value.substring(target.selectionStart, target.selectionEnd);
      var newStarNum = target.value.substring(0, target.selectionStart).length;
      textArea.setSelectionRange({
        start: target.value.indexOf(modifiedText),
        end: target.selectionEnd
      });
      var modifiedTextObj = (0, _markdownUtils.insertBeforeEachLine)(modifiedText, e.shiftKey ? '' : space);
      var text = modifiedTextObj.modifiedText;
      if (e.shiftKey) {
        text = text.split('\n').map(function (item) {
          return item.replace(new RegExp("^".concat(space)), '');
        }).join('\n');
      }
      textArea.replaceSelection(text);
      var startTabSize = e.shiftKey ? -tabSize : tabSize;
      var endTabSize = e.shiftKey ? -modifiedTextLine.length * tabSize : modifiedTextLine.length * tabSize;
      textArea.setSelectionRange({
        start: newStarNum + startTabSize,
        end: newStarNum + oldSelectText.length + endTabSize
      });
    } else {
      return (0, _InsertTextAtPosition.insertTextAtPosition)(target, space);
    }
  } else if (e.keyCode === 13 && e.code.toLowerCase() === 'enter' && (/^(-|\*)\s/.test(currentLineStr) || /^\d+.\s/.test(currentLineStr)) && !e.shiftKey) {
    /**
     * `13` - `Enter`
     */
    stopPropagation(e);
    var startStr = '\n- ';
    if (currentLineStr.startsWith('*')) {
      startStr = '\n* ';
    }
    if (currentLineStr.startsWith('- [ ]') || currentLineStr.startsWith('- [X]') || currentLineStr.startsWith('- [x]')) {
      startStr = '\n- [ ] ';
    }
    if (/^\d+.\s/.test(currentLineStr)) {
      startStr = "\n".concat(parseInt(currentLineStr) + 1, ". ");
    }
    return (0, _InsertTextAtPosition.insertTextAtPosition)(target, startStr);
  } else if (e.code && e.code.toLowerCase() === 'keyd' && e.ctrlKey) {
    // Duplicate lines
    stopPropagation(e);
    var selection = {
      start: target.selectionStart,
      end: target.selectionEnd
    };
    var savedSelection = selection;
    selection = (0, _markdownUtils.selectLine)({
      text: target.value,
      selection: selection
    });
    var textToDuplicate = target.value.slice(selection.start, selection.end);
    textArea.setSelectionRange({
      start: selection.end,
      end: selection.end
    });
    (0, _InsertTextAtPosition.insertTextAtPosition)(target, "\n".concat(textToDuplicate));
    textArea.setSelectionRange({
      start: savedSelection.start,
      end: savedSelection.end
    });
  } else if (e.code && e.code.toLowerCase() === 'arrowup' && e.altKey) {
    handleLineMove(e, -1);
  } else if (e.code && e.code.toLowerCase() === 'arrowdown' && e.altKey) {
    handleLineMove(e, 1);
  }
}
module.exports = exports.default;