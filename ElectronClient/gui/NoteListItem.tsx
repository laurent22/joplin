import * as React from 'react';
import { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
const { themeStyle } = require('lib/theme');
const Mark = require('mark.js/dist/mark.min.js');
const markJsUtils = require('lib/markJsUtils');
const Note = require('lib/models/Note');
const { replaceRegexDiacritics, pregQuote } = require('lib/string-utils');

interface NoteListItemProps {
	theme: number,
	width: number,
	style: any,
	dragItemIndex: number,
	highlightedWords: string[],
	index: number,
	isProvisional: boolean,
	isSelected: boolean,
	isWatched: boolean
	item: any,
	itemCount: number,
	onCheckboxClick: any,
	onDragStart: any,
	onNoteDragOver: any,
	onNoteDrop: any,
	onTitleClick: any,
	onContextMenu(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>): void,
}

function NoteListItem(props:NoteListItemProps, ref:any) {
	const item = props.item;
	const theme = themeStyle(props.theme);
	const hPadding = 10;

	const anchorRef = useRef(null);

	useImperativeHandle(ref, () => {
		return {
			focus: function() {
				if (anchorRef.current) anchorRef.current.focus();
			},
		};
	});

	let rootStyle = Object.assign({ width: props.width, opacity: props.isProvisional ? 0.5 : 1 }, props.style.listItem);

	if (props.isSelected) rootStyle = Object.assign(rootStyle, props.style.listItemSelected);

	if (props.dragItemIndex === props.index) {
		rootStyle.borderTop = `2px solid ${theme.color}`;
	} else if (props.index === props.itemCount - 1 && props.dragItemIndex >= props.itemCount) {
		rootStyle.borderBottom = `2px solid ${theme.color}`;
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
			<div style={{ display: 'flex', height: rootStyle.height, alignItems: 'center', paddingLeft: hPadding }}>
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

	// key={`${item.id}_${item.todo_completed}`}

	// Need to include "todo_completed" in key so that checkbox is updated when
	// item is changed via sync.
	return (
		<div className="list-item-container" style={rootStyle} onDragOver={props.onNoteDragOver} onDrop={props.onNoteDrop}>
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
		</div>
	);
}

export default forwardRef(NoteListItem);
