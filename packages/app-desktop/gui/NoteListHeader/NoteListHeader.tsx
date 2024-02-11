import * as React from 'react';
import { useMemo } from 'react';
import { OnClickHandler } from '@joplin/lib/services/plugins/api/noteListType';
import { CSSProperties } from 'styled-components';
import { Column } from '../NoteList/utils/types';

interface Props {
	template: string;
	height: number;
	onClick: OnClickHandler;
	columns: Column[];
}

const defaultHeight = 26;

interface HeaderItem {
	isFirst: boolean;
	column: Column;
}

const ItemComp = (props: HeaderItem) => {
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
		return output;
	}, [props.isFirst]);

	return (
		<div className={classes.join(' ')} style={style}>
			<div className="inner">
				{column.title}
			</div>
		</div>
	);
};

export default (props: Props) => {
	const items: React.JSX.Element[] = [];

	let isFirst = true;
	for (const column of props.columns) {
		items.push(<ItemComp
			isFirst={isFirst}
			key={column.name}
			column={column}
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

// const useContentElement = (rootElement:HTMLDivElement, height:number, template:string) => {
// 	const [contentElement, setContentElement] = useState<HTMLDivElement>(null)
// 	useEffect(() => {
// 		if (!rootElement) return () => {};
// 		const element = document.createElement('div');
// 		element.className = 'note-list-header-content';
// 		element.style.height = `${height}px`;
// 		element.innerHTML = template;
// 		rootElement.appendChild(element);
// 		setContentElement(element);
// 		return () => {
// 			element.remove();
// 		};
// 	}, [rootElement, height, template]);
// 	return contentElement;
// }

// export default (props:Props) => {
// 	const onHeaderClick = useCallback((event:React.MouseEvent<HTMLElement>) => {
// 		if (!props.onClick) return;
// 		const elementId = event.currentTarget.getAttribute('data-id');
// 		props.onClick({ elementId });
// 	}, []);

// 	const rootElement = useRootElement(rootElementId);
// 	const height = props.height === undefined ? defaultHeight : props.height;
// 	const contentElement = useContentElement(rootElement, height, props.template);
// 	useItemEventHandlers(rootElement, contentElement, null, onHeaderClick);

// 	return <div
// 		id={rootElementId}
// 	>
// 	</div>;
// }
