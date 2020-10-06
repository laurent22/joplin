/// <reference types="react" />
export declare const dragBarThickness = 5;
export declare enum LayoutItemDirection {
    Row = "row",
    Column = "column"
}
export interface Size {
    width: number;
    height: number;
}
export interface LayoutItem {
    key: string;
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    children?: LayoutItem[];
    direction?: LayoutItemDirection;
    resizableRight?: boolean;
    resizableBottom?: boolean;
    visible?: boolean;
    context?: any;
}
interface onResizeEvent {
    layout: LayoutItem;
}
interface Props {
    layout: LayoutItem;
    onResize(event: onResizeEvent): void;
    width?: number;
    height?: number;
    renderItem: Function;
}
export declare function allDynamicSizes(layout: LayoutItem): any;
export declare function findItemByKey(layout: LayoutItem, key: string): LayoutItem;
declare function ResizableLayout(props: Props): JSX.Element;
export default ResizableLayout;
