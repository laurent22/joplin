import * as React from 'react';
interface NoteListItemProps {
    themeId: number;
    width: number;
    height: number;
    style: any;
    dragItemIndex: number;
    highlightedWords: string[];
    index: number;
    isProvisional: boolean;
    isSelected: boolean;
    isWatched: boolean;
    item: any;
    itemCount: number;
    onCheckboxClick: any;
    onDragStart: any;
    onNoteDragOver: any;
    onNoteDrop: any;
    onTitleClick: any;
    onContextMenu(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>): void;
}
declare const _default: React.ForwardRefExoticComponent<NoteListItemProps & React.RefAttributes<unknown>>;
export default _default;
