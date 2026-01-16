import { type JSX } from 'react';
import './Child.less';
import { type IToolbarProps } from './';
export type ChildProps = IToolbarProps & {
    children?: JSX.Element;
    groupName?: string;
};
export default function Child(props: ChildProps): import("react/jsx-runtime").JSX.Element;
