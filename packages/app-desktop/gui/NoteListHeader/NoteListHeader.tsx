import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { OnClickHandler } from '@joplin/lib/services/plugins/api/noteListType';
import { CSSProperties } from 'styled-components';
import { Column } from '../NoteList/utils/types';

interface OnItemClickEvent {
	name: string;
}

export type OnItemClickEventHander = (event: OnItemClickEvent)=> void;

interface Props {
	template: string;
	height: number;
	onClick: OnClickHandler;
	columns: Column[];
	notesSortOrderField: string;
	notesSortOrderReverse: boolean;
	onItemClick: OnItemClickEventHander;
}

const defaultHeight = 26;

interface HeaderItemProps {
	isFirst: boolean;
	column: Column;
	isCurrent: boolean;
	isReverse: boolean;
	onClick: OnItemClickEventHander;
}

const HeaderItem = (props: HeaderItemProps) => {
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
		return output;
	}, [props.isFirst, props.isCurrent, props.isReverse]);

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
		return <span className="titlewrapper">{column.title}{chevron}</span>;
	};

	return (
		<div data-name={column.name} className={classes.join(' ')} style={style} onClick={onClick}>
			<div className="inner">
				{renderTitle()}
			</div>
		</div>
	);
};

export default (props: Props) => {
	const items: React.JSX.Element[] = [];

	let isFirst = true;
	for (const column of props.columns) {
		items.push(<HeaderItem
			isFirst={isFirst}
			key={column.name}
			column={column}
			isCurrent={`note.${props.notesSortOrderField}` === column.name}
			isReverse={props.notesSortOrderReverse}
			onClick={props.onItemClick}
		/>);
		isFirst = false;
	}

	const itemHeight = props.height ? props.height : defaultHeight;

	const style = useMemo(() => {
		return { height: itemHeight } as CSSProperties;
	}, [itemHeight]);

	return (
		<div className="note-list-header" style={style}>
			{items}
		</div>
	);
};
