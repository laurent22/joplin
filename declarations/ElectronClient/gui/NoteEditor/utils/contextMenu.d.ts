export declare enum ContextMenuItemType {
    None = "",
    Image = "image",
    Resource = "resource",
    Text = "text",
    Link = "link"
}
export interface ContextMenuOptions {
    itemType: ContextMenuItemType;
    resourceId: string;
    linkToCopy: string;
    textToCopy: string;
    htmlToCopy: string;
    insertContent: Function;
    isReadOnly?: boolean;
}
interface ContextMenuItem {
    label: string;
    onAction: Function;
    isActive: Function;
}
interface ContextMenuItems {
    [key: string]: ContextMenuItem;
}
export declare function menuItems(): ContextMenuItems;
export default function contextMenu(options: ContextMenuOptions): Promise<any>;
export {};
