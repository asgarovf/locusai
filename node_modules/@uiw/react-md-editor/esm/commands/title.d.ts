import { ICommand, ExecuteState, TextAreaTextApi } from './';
export declare function headingExecute({ state, api, prefix, suffix, }: {
    state: ExecuteState;
    api: TextAreaTextApi;
    prefix: string;
    suffix?: string;
}): void;
export declare const heading: ICommand;
/**
 * @deprecated Use `heading` instead.
 * This command is now deprecated and will be removed in future versions.
 * Use `title` for inserting headings.
 */
export declare const title: ICommand;
