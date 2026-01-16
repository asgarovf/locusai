export function selectWord(_ref) {
  var {
    text,
    selection,
    prefix,
    suffix = prefix
  } = _ref;
  var result = selection;
  if (text && text.length && selection.start === selection.end) {
    result = getSurroundingWord(text, selection.start);
  }
  if (result.start >= prefix.length && result.end <= text.length - suffix.length) {
    var selectedTextContext = text.slice(result.start - prefix.length, result.end + suffix.length);
    if (selectedTextContext.startsWith(prefix) && selectedTextContext.endsWith(suffix)) {
      return {
        start: result.start - prefix.length,
        end: result.end + suffix.length
      };
    }
  }
  return result;
}
export function selectLine(_ref2) {
  var {
    text,
    selection
  } = _ref2;
  var start = text.slice(0, selection.start).lastIndexOf('\n') + 1;
  var end = text.slice(selection.end).indexOf('\n') + selection.end;
  if (end === selection.end - 1) {
    end = text.length;
  }
  return {
    start,
    end
  };
}

/**
 *  Gets the number of line-breaks that would have to be inserted before the given 'startPosition'
 *  to make sure there's an empty line between 'startPosition' and the previous text
 */
export function getBreaksNeededForEmptyLineBefore(text, startPosition) {
  if (text === void 0) {
    text = '';
  }
  if (startPosition === 0) return 0;

  // rules:
  // - If we're in the first line, no breaks are needed
  // - Otherwise there must be 2 breaks before the previous character. Depending on how many breaks exist already, we
  //      may need to insert 0, 1 or 2 breaks

  var neededBreaks = 2;
  var isInFirstLine = true;
  for (var i = startPosition - 1; i >= 0 && neededBreaks >= 0; i--) {
    switch (text.charCodeAt(i)) {
      case 32:
        // blank space
        continue;
      case 10:
        // line break
        neededBreaks--;
        isInFirstLine = false;
        break;
      default:
        return neededBreaks;
    }
  }
  return isInFirstLine ? 0 : neededBreaks;
}

/**
 *  Gets the number of line-breaks that would have to be inserted after the given 'startPosition'
 *  to make sure there's an empty line between 'startPosition' and the next text
 */
export function getBreaksNeededForEmptyLineAfter(text, startPosition) {
  if (text === void 0) {
    text = '';
  }
  if (startPosition === text.length - 1) return 0;

  // rules:
  // - If we're in the first line, no breaks are needed
  // - Otherwise there must be 2 breaks before the previous character. Depending on how many breaks exist already, we
  //      may need to insert 0, 1 or 2 breaks

  var neededBreaks = 2;
  var isInLastLine = true;
  for (var i = startPosition; i < text.length && neededBreaks >= 0; i++) {
    switch (text.charCodeAt(i)) {
      case 32:
        continue;
      case 10:
        {
          neededBreaks--;
          isInLastLine = false;
          break;
        }
      default:
        return neededBreaks;
    }
  }
  return isInLastLine ? 0 : neededBreaks;
}
export function getSurroundingWord(text, position) {
  if (!text) throw Error("Argument 'text' should be truthy");
  var isWordDelimiter = c => c === ' ' || c.charCodeAt(0) === 10;

  // leftIndex is initialized to 0 because if selection is 0, it won't even enter the iteration
  var start = 0;
  // rightIndex is initialized to text.length because if selection is equal to text.length it won't even enter the interation
  var end = text.length;

  // iterate to the left
  for (var i = position; i - 1 > -1; i--) {
    if (isWordDelimiter(text[i - 1])) {
      start = i;
      break;
    }
  }

  // iterate to the right
  for (var _i = position; _i < text.length; _i++) {
    if (isWordDelimiter(text[_i])) {
      end = _i;
      break;
    }
  }
  return {
    start,
    end
  };
}
export function executeCommand(_ref3) {
  var {
    api,
    selectedText,
    selection,
    prefix,
    suffix = prefix
  } = _ref3;
  if (selectedText.length >= prefix.length + suffix.length && selectedText.startsWith(prefix) && selectedText.endsWith(suffix)) {
    api.replaceSelection(selectedText.slice(prefix.length, suffix.length ? -suffix.length : undefined));
    api.setSelectionRange({
      start: selection.start - prefix.length,
      end: selection.end - prefix.length
    });
  } else {
    api.replaceSelection("" + prefix + selectedText + suffix);
    api.setSelectionRange({
      start: selection.start + prefix.length,
      end: selection.end + prefix.length
    });
  }
}
/**
 * Inserts insertionString before each line
 */
export function insertBeforeEachLine(selectedText, insertBefore) {
  var lines = selectedText.split(/\n/);
  var insertionLength = 0;
  var modifiedText = lines.map((item, index) => {
    if (typeof insertBefore === 'string') {
      if (item.startsWith(insertBefore)) {
        insertionLength -= insertBefore.length;
        return item.slice(insertBefore.length);
      }
      insertionLength += insertBefore.length;
      return insertBefore + item;
    }
    if (typeof insertBefore === 'function') {
      if (item.startsWith(insertBefore(item, index))) {
        insertionLength -= insertBefore(item, index).length;
        return item.slice(insertBefore(item, index).length);
      }
      var insertionResult = insertBefore(item, index);
      insertionLength += insertionResult.length;
      return insertBefore(item, index) + item;
    }
    throw Error('insertion is expected to be either a string or a function');
  }).join('\n');
  return {
    modifiedText,
    insertionLength
  };
}