import { TextAreaTextApi, type TextRange } from '../commands';
export interface TextSection {
    text: string;
    selection: TextRange;
}
export declare function selectWord({ text, selection, prefix, suffix, }: {
    text: string;
    selection: TextRange;
    prefix: string;
    suffix?: string;
}): TextRange;
export declare function selectLine({ text, selection }: TextSection): TextRange;
/**
 *  Gets the number of line-breaks that would have to be inserted before the given 'startPosition'
 *  to make sure there's an empty line between 'startPosition' and the previous text
 */
export declare function getBreaksNeededForEmptyLineBefore(text: string | undefined, startPosition: number): number;
/**
 *  Gets the number of line-breaks that would have to be inserted after the given 'startPosition'
 *  to make sure there's an empty line between 'startPosition' and the next text
 */
export declare function getBreaksNeededForEmptyLineAfter(text: string | undefined, startPosition: number): number;
export declare function getSurroundingWord(text: string, position: number): TextRange;
export declare function executeCommand({ api, selectedText, selection, prefix, suffix, }: {
    api: TextAreaTextApi;
    selectedText: string;
    selection: TextRange;
    prefix: string;
    suffix?: string;
}): void;
export type AlterLineFunction = (line: string, index: number) => string;
/**
 * Inserts insertionString before each line
 */
export declare function insertBeforeEachLine(selectedText: string, insertBefore: string | AlterLineFunction): {
    modifiedText: string;
    insertionLength: number;
};
