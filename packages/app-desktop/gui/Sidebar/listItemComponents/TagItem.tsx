import Setting from '@joplin/lib/models/Setting';
import * as React from 'react';
import { useCallback } from 'react';
import { StyledListItemAnchor, StyledSpanFix } from '../styles';
import { TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import BaseModel from '@joplin/lib/BaseModel';
import NoteCount from './NoteCount';
import Tag from '@joplin/lib/models/Tag';
import EmptyExpandLink from './EmptyExpandLink';
import ListItemWrapper, { ListItemRef } from './ListItemWrapper';

export type TagLinkClickEvent = { tag: TagsWithNoteCountEntity|undefined };

interface Props {
	anchorRef: ListItemRef;
	selected: boolean;
	tag: TagsWithNoteCountEntity;
	onTagDrop: React.DragEventHandler<HTMLElement>;
	onContextMenu: React.MouseEventHandler<HTMLElement>;
	onClick: (event: TagLinkClickEvent)=> void;

	itemCount: number;
	index: number;
}

const TagItem = (props: Props) => {
	const { tag, selected } = props;

	let noteCount = null;
	if (Setting.value('showNoteCounts')) {
		const count = Setting.value('showCompletedTodos') ? tag.note_count : tag.note_count - tag.todo_completed_count;
		noteCount = <NoteCount count={count}/>;
	}

	const onClickHandler = useCallback(() => {
		props.onClick({ tag });
	}, [props.onClick, tag]);

	return (
		<ListItemWrapper
			containerRef={props.anchorRef}
			selected={selected}
			depth={1}
			className={`list-item-container ${selected ? 'selected' : ''}`}
			highlightOnHover={true}
			onDrop={props.onTagDrop}
			data-tag-id={tag.id}
			aria-selected={selected}
			itemIndex={props.index}
			itemCount={props.itemCount}
		>
			<EmptyExpandLink/>
			<StyledListItemAnchor
				className="list-item"
				selected={selected}
				data-id={tag.id}
				data-type={BaseModel.TYPE_TAG}
				onContextMenu={props.onContextMenu}
				onClick={onClickHandler}
			>
				<StyledSpanFix className="tag-label">{Tag.displayTitle(tag)}</StyledSpanFix>
				{noteCount}
			</StyledListItemAnchor>
		</ListItemWrapper>
	);
};

export default TagItem;
