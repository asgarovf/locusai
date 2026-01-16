import React from 'react';
import { type IProps } from '../../Types';
import './index.less';
export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'>, IProps {
}
export default function Textarea(props: TextAreaProps): import("react/jsx-runtime").JSX.Element;
