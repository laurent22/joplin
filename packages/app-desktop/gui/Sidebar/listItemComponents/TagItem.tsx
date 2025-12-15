import Setting from '@joplin/lib/models/Setting';
import * as React from 'react';
import { useCallback } from 'react';
import { StyledListItemAnchor, StyledSpanFix } from '../styles';
import { TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import NoteCount from './NoteCount';
import EmptyExpandLink from './EmptyExpandLink';
import ListItemWrapper, { ItemSelectionState, ListItemRef } from './ListItemWrapper';
import { ItemClickEvent } from '../hooks/useOnItemClick';

interface Props {
	anchorRef: ListItemRef;
	selectionState: ItemSelectionState;
	tag: TagsWithNoteCountEntity;
	label: string;
	onTagDrop: React.DragEventHandler<HTMLElement>;
	onContextMenu: React.MouseEventHandler<HTMLElement>;
	onClick: (event: ItemClickEvent)=> void;

	itemCount: number;
	index: number;
}

const TagItem = (props: Props) => {
	const { tag, selectionState } = props;

	let noteCount = null;
	if (Setting.value('showNoteCounts')) {
		const count = Setting.value('showCompletedTodos') ? tag.note_count : tag.note_count - tag.todo_completed_count;
		noteCount = <NoteCount count={count}/>;
	}

	const onClickHandler: React.MouseEventHandler<HTMLElement> = useCallback((event) => {
		props.onClick({ id: tag.id, type: ModelType.Tag, event });
	}, [props.onClick, tag]);

	return (
		<ListItemWrapper
			containerRef={props.anchorRef}
			selectionState={selectionState}
			depth={1}
			className={`list-item-container ${selectionState.selected ? 'selected' : ''}`}
			highlightOnHover={true}
			onDrop={props.onTagDrop}
			onContextMenu={props.onContextMenu}
			data-id={tag.id}
			data-tag-id={tag.id}
			data-type={ModelType.Tag}
			itemIndex={props.index}
			itemCount={props.itemCount}
		>
			<EmptyExpandLink/>
			<StyledListItemAnchor
				className="list-item"
				selected={selectionState.selected}
				data-id={tag.id}
				data-type={BaseModel.TYPE_TAG}
				onClick={onClickHandler}
			>
				<StyledSpanFix className="tag-label">{props.label}</StyledSpanFix>
				{noteCount}
			</StyledListItemAnchor>
		</ListItemWrapper>
	);
};

export default TagItem;
