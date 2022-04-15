import * as React from 'react';
import { useMemo } from 'react';
import { AppState } from '../app.reducer';

const { connect } = require('react-redux');
const { themeStyle } = require('@joplin/lib/theme');
const TagItem = require('./TagItem.min.js');

interface Props {
	themeId: number;
	style: any;
	items: any[];
}

function TagList(props: Props) {
	const style = useMemo(() => {
		const theme = themeStyle(props.themeId);

		const output = { ...props.style };
		output.display = 'flex';
		output.flexDirection = 'row';
		output.boxSizing = 'border-box';
		output.fontSize = theme.fontSize;
		output.whiteSpace = 'nowrap';
		output.paddingTop = 8;
		output.paddingBottom = 8;
		return output;
	}, [props.style, props.themeId]);

	const tags = useMemo(() => {
		const output = props.items.slice();

		output.sort((a: any, b: any) => {
			return a.title < b.title ? -1 : +1;
		});

		return output;
	}, [props.items]);

	const tagItems = useMemo(() => {
		const output = [];
		for (let i = 0; i < tags.length; i++) {
			const props = {
				title: tags[i].title,
				id: tags[i].id,
				key: tags[i].id,
			};
			output.push(<TagItem {...props} />);
		}
		return output;
	}, [tags]);

	return (
		<div className="tag-list" style={style}>
			{tagItems}
		</div>
	);
}

const mapStateToProps = (state: AppState) => {
	return { themeId: state.settings.theme };
};

export default connect(mapStateToProps)(TagList);
