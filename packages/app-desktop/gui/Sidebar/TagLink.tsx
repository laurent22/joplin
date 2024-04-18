import Setting from '@joplin/lib/models/Setting';
import * as React from 'react';
import { forwardRef, useCallback } from 'react';
import { StyledListItem, StyledListItemAnchor, StyledSpanFix } from './styles';
import { TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import BaseModel from '@joplin/lib/BaseModel';
import NoteCount from './NoteCount';
import Tag from '@joplin/lib/models/Tag';
import EmptyExpandLink from './EmptyExpandLink';

export type TagLinkClickEvent = { tag: TagsWithNoteCountEntity|undefined };

interface Props {
	selected: boolean;
	tag: TagsWithNoteCountEntity;
	onTagDrop: React.DragEventHandler<HTMLElement>;
	onContextMenu: React.MouseEventHandler<HTMLElement>;
	onClick: (event: TagLinkClickEvent)=> void;
}

const TagLink = forwardRef((props: Props, ref: React.ForwardedRef<HTMLAnchorElement>) => {
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
		<StyledListItem selected={selected}
			className={`list-item-container ${selected ? 'selected' : ''}`}
			onDrop={props.onTagDrop}
			data-tag-id={tag.id}
		>
			<EmptyExpandLink/>
			<StyledListItemAnchor
				ref={ref}
				className="list-item"
				href="#"
				selected={selected}
				data-id={tag.id}
				data-type={BaseModel.TYPE_TAG}
				onContextMenu={props.onContextMenu}
				onClick={onClickHandler}
			>
				<StyledSpanFix className="tag-label">{Tag.displayTitle(tag)}</StyledSpanFix>
				{noteCount}
			</StyledListItemAnchor>
		</StyledListItem>
	);
});

export default TagLink;
