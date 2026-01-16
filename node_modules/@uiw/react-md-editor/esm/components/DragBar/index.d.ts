import React from 'react';
import { type IProps } from '../../Types';
import './index.less';
export interface IDragBarProps extends IProps {
    height: number;
    maxHeight: number;
    minHeight: number;
    onChange: (value: number) => void;
}
declare const DragBar: React.FC<IDragBarProps>;
export default DragBar;
