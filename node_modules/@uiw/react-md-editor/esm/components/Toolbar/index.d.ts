import { type IProps } from '../../Types';
import { ICommand } from '../../commands/';
import './index.less';
export interface IToolbarProps extends IProps {
    overflow?: boolean;
    onCommand?: (command: ICommand<string>, groupName?: string) => void;
    commands?: ICommand<string>[];
    isChild?: boolean;
}
export declare function ToolbarItems(props: IToolbarProps): import("react/jsx-runtime").JSX.Element;
export default function Toolbar(props?: IToolbarProps): import("react/jsx-runtime").JSX.Element;
interface ToolbarVisibilityProps {
    hideToolbar?: boolean;
    toolbarBottom: boolean;
    placement: 'bottom' | 'top';
    overflow: boolean;
    prefixCls: string;
}
export declare function ToolbarVisibility(props: ToolbarVisibilityProps): import("react/jsx-runtime").JSX.Element | null;
export {};
