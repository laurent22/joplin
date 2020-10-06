import { LayoutItem, Size } from '../ResizableLayout';
export interface LayoutItemSizes {
    [key: string]: Size;
}
export declare function itemSize(item: LayoutItem, sizes: LayoutItemSizes): Size;
export default function useLayoutItemSizes(layout: LayoutItem): LayoutItemSizes;
