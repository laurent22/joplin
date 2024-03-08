import * as React from 'react';
import { useMemo } from 'react';
import { AppState } from '../app.reducer';
import TagItem from './TagItem';
import Setting from '@joplin/lib/models/Setting';

const { connect } = require('react-redux');
const { themeStyle } = require('@joplin/lib/theme');

interface Props {
	themeId: number;
	style: any;
	items: any[];
}

function TagList(props: Props) {
	const collatorLocale = Setting.value('locale').slice(0, 2);
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
		const collator = new Intl.Collator(collatorLocale, { numeric: true, sensitivity: 'base' });
		output.sort((a: any, b: any) => {
			return collator.compare(a.title, b.title);
		});

		return output;
	}, [props.items, collatorLocale]);

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
