import * as React from 'react';
import { CSSProperties, useMemo, useCallback } from 'react';
import { OnItemClickHander } from './types';
import { NoteListColumn } from '@joplin/lib/services/plugins/api/noteListType';
import getColumnTitle from './utils/getColumnTitle';

interface Props {
	isFirst: boolean;
	column: NoteListColumn;
	isCurrent: boolean;
	isReverse: boolean;
	onClick: OnItemClickHander;
	onDragStart: React.DragEventHandler;
	onDragOver: React.DragEventHandler;
	onDrop: React.DragEventHandler;
	onResizerDragStart: React.DragEventHandler;
	onResizerDragEnd: React.DragEventHandler;
	dragCursorLocation: 'before' | 'after' | null;
}

export default (props: Props) => {
	const column = props.column;

	const style = useMemo(() => {
		const output: CSSProperties = {};
		if (column.width) {
			output.width = column.width;
		} else {
			output.flex = 1;
		}
		return output;
	}, [column.width]);

	const classes = useMemo(() => {
		const output: string[] = ['item'];
		if (props.isFirst) output.push('-first');
		if (props.isCurrent) {
			output.push('-current');
			if (props.isReverse) output.push('-reverse');
		}
		if (props.dragCursorLocation) output.push(`-drop-${props.dragCursorLocation}`);
		return output;
	}, [props.isFirst, props.isCurrent, props.isReverse, props.dragCursorLocation]);

	const onClick: React.MouseEventHandler = useCallback((event) => {
		const name = event.currentTarget.getAttribute('data-name');
		props.onClick({ name });
	}, [props.onClick]);

	const renderTitle = () => {
		let chevron = null;
		if (props.isCurrent) {
			const classes = ['chevron', 'fas'];
			classes.push(props.isReverse ? 'fa-chevron-down' : 'fa-chevron-up');
			chevron = <i className={classes.join(' ')}></i>;
		}
		const title = getColumnTitle(column.name);
		let titleElement: React.ReactNode = title;

		if (column.name === 'note.checkboxes') {
			titleElement = <i className="fas fa-adjust" aria-label={title} title={title}></i>;
		} else if (column.name === 'note.is_todo') {
			titleElement = <i className="fas fa-check" aria-label={title} title={title}></i>;
		}

		return <span className="titlewrapper">{titleElement}{chevron}</span>;
	};

	const renderResizer = () => {
		if (props.isFirst) return null;

		return (
			<div
				className="resizer"
				data-name={column.name}
				draggable={true}
				onDragStart={props.onResizerDragStart}
				onDragEnd={props.onResizerDragEnd}
			/>
		);
	};

	return (
		<a
			data-name={column.name}
			draggable={true}
			className={classes.join(' ')}
			style={style}
			title={getColumnTitle(column.name)}
			onClick={onClick}
			onDragStart={props.onDragStart}
			onDragOver={props.onDragOver}
			onDrop={props.onDrop}
		>

			{renderResizer()}

			<div className="inner">
				{renderTitle()}
			</div>
		</a>
	);
};
