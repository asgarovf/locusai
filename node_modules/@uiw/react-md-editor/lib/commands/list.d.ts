import { type ICommand, type ExecuteState, TextAreaTextApi } from './';
import { AlterLineFunction } from '../utils/markdownUtils';
export declare const makeList: (state: ExecuteState, api: TextAreaTextApi, insertBefore: string | AlterLineFunction) => void;
export declare const unorderedListCommand: ICommand;
export declare const orderedListCommand: ICommand;
export declare const checkedListCommand: ICommand;
