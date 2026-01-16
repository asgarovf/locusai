import { type ICommand, type ICommandChildCommands, type ICommandChildHandle } from './';
export type GroupOptions = Omit<ICommand<string>, 'children'> & {
    children?: ICommandChildHandle['children'];
};
export declare const group: (arr: ICommandChildCommands["children"], options?: GroupOptions) => ICommand<string>;
