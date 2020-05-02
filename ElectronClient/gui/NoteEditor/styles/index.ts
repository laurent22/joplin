import { NoteTextProps } from '../utils/types';

const { buildStyle } = require('../../../theme.js');

export default function styles(props: NoteTextProps) {
	return buildStyle('NoteEditor', props.theme, (theme: any) => {
		return {
			root: {
				...props.style,
				boxSizing: 'border-box',
				paddingLeft: 10,
				paddingTop: 10,
				borderLeftWidth: 1,
				borderLeftColor: theme.dividerColor,
				borderLeftStyle: 'solid',
			},
			titleInput: {
				flex: 1,
				display: 'inline-block',
				paddingTop: 5,
				paddingBottom: 5,
				paddingLeft: 8,
				paddingRight: 8,
				marginRight: theme.paddingLeft,
				color: theme.textStyle.color,
				fontSize: theme.textStyle.fontSize * 1.25 * 1.5,
				backgroundColor: theme.backgroundColor,
				border: '1px solid',
				borderColor: theme.dividerColor,
			},
			warningBanner: {
				background: theme.warningBackgroundColor,
				fontFamily: theme.fontFamily,
				padding: 10,
				fontSize: theme.fontSize,
			},
			tinyMCE: {
				width: '100%',
				height: '100%',
			},
			toolbar: {
				marginTop: 4,
				marginBottom: 0,
			},
			titleDate: {
				...theme.textStyle,
				color: theme.colorFaded,
				paddingLeft: 10,
				paddingRight: 10,
			},
		};
	});
}
