import * as React from 'react';
import { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
const { themeStyle } = require('@joplin/lib/theme');
const Mark = require('mark.js/dist/mark.min.js');
const markJsUtils = require('@joplin/lib/markJsUtils');
import Note from '@joplin/lib/models/Note';
const { replaceRegexDiacritics, pregQuote } = require('@joplin/lib/string-utils');
const styled = require('styled-components').default;

const StyledRoot = styled.div`
	width: ${(props: any) => props.width}px;
	height: ${(props: any) => props.height}px;
	opacity: ${(props: any) => props.isProvisional ? '0.5' : '1'};
	max-width: 100%;
	box-sizing: border-box;
	display: flex;
	align-items: stretch;
	position: relative;
	background-color: ${(props: any) => props.selected ? props.theme.selectedColor : 'none'};

	border-style: solid;
	border-color: ${(props: any) => props.theme.color};
	border-top-width: ${(props: any) => props.dragItemPosition === 'top' ? 2 : 0}px;
	border-bottom-width: ${(props: any) => props.dragItemPosition === 'bottom' ? 2 : 0}px;
	border-right: none;
	border-left: none;

	// https://stackoverflow.com/questions/50174448/css-how-to-add-white-space-before-elements-border
	&::before {
		content: '';
		border-bottom: 1px solid ${(props: any) => props.theme.dividerColor};
		width: ${(props: any) => props.width - 32}px;
		position: absolute;
		bottom: 0;
		left: 16px;
	}

	&:hover {
		background-color: ${(props: any) => props.theme.backgroundColorHover3};
	}
`;

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

function NoteListItem(props: NoteListItemProps, ref: any) {
	const item = props.item;
	const theme = themeStyle(props.themeId);
	const hPadding = 16;

	const anchorRef = useRef(null);

	useImperativeHandle(ref, () => {
		return {
			focus: function() {
				if (anchorRef.current) anchorRef.current.focus();
			},
			getHeight: () => anchorRef.current?.clientHeight,
		};
	});

	let dragItemPosition = '';
	if (props.dragItemIndex === props.index) {
		dragItemPosition = 'top';
	} else if (props.index === props.itemCount - 1 && props.dragItemIndex >= props.itemCount) {
		dragItemPosition = 'bottom';
	}

	const onTitleClick = useCallback((event) => {
		props.onTitleClick(event, props.item);
	}, [props.onTitleClick, props.item]);

	const onCheckboxClick = useCallback((event) => {
		props.onCheckboxClick(event, props.item);
	}, [props.onCheckboxClick, props.item]);

	// Setting marginBottom = 1 because it makes the checkbox looks more centered, at least on Windows
	// but don't know how it will look in other OSes.
	function renderCheckbox() {
		if (!item.is_todo) return null;

		return (
			<div style={{ display: 'flex', height: props.height, alignItems: 'center', paddingLeft: hPadding }}>
				<input
					style={{ margin: 0, marginBottom: 1, marginRight: 5 }}
					type="checkbox"
					checked={!!item.todo_completed}
					onChange={onCheckboxClick}
				/>
			</div>
		);
	}

	let listItemTitleStyle = Object.assign({}, props.style.listItemTitle);
	listItemTitleStyle.paddingLeft = !item.is_todo ? hPadding : 4;
	if (item.is_shared) listItemTitleStyle.color = theme.colorWarn3;
	if (item.is_todo && !!item.todo_completed) listItemTitleStyle = Object.assign(listItemTitleStyle, props.style.listItemTitleCompleted);

	const displayTitle = Note.displayTitle(item);
	let titleComp = null;

	if (props.highlightedWords.length) {
		const titleElement = document.createElement('span');
		titleElement.textContent = displayTitle;
		const mark = new Mark(titleElement, {
			exclude: ['img'],
			acrossElements: true,
		});

		mark.unmark();

		for (let i = 0; i < props.highlightedWords.length; i++) {
			const w = props.highlightedWords[i];

			markJsUtils.markKeyword(mark, w, {
				pregQuote: pregQuote,
				replaceRegexDiacritics: replaceRegexDiacritics,
			});
		}

		// Note: in this case it is safe to use dangerouslySetInnerHTML because titleElement
		// is a span tag that we created and that contains data that's been inserted as plain text
		// with `textContent` so it cannot contain any XSS attacks. We use this feature because
		// mark.js can only deal with DOM elements.
		// https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
		titleComp = <span dangerouslySetInnerHTML={{ __html: titleElement.outerHTML }}></span>;
	} else {
		titleComp = <span>{displayTitle}</span>;
	}

	const watchedIconStyle = {
		paddingRight: 4,
		color: theme.color,
	};
	const watchedIcon = props.isWatched ? null : <i style={watchedIconStyle} className={'fa fa-share-square'}></i>;
	const classNames = [
		'list-item-container',
		props.isSelected && 'selected',
		item.todo_completed && 'todo-completed',
		item.is_todo ? 'todo-list-item' : 'note-list-item',
		(props.index + 1) % 2 === 0 ? 'even' : 'odd',
	]
		.filter(e => !!e)
		.join(' ');

	// Need to include "todo_completed" in key so that checkbox is updated when
	// item is changed via sync.
	return (
		<StyledRoot
			className={classNames}
			onDragOver={props.onNoteDragOver}
			onDrop={props.onNoteDrop}
			width={props.width}
			height={props.height}
			isProvisional={props.isProvisional}
			selected={props.isSelected}
			dragItemPosition={dragItemPosition}
		>
			{renderCheckbox()}
			<a
				ref={anchorRef}
				onContextMenu={props.onContextMenu}
				href="#"
				draggable={true}
				style={listItemTitleStyle}
				onClick={onTitleClick}
				onDragStart={props.onDragStart}
				data-id={item.id}
			>
				{watchedIcon}
				{titleComp}
			</a>
		</StyledRoot>
	);
}

export default forwardRef(NoteListItem);
