import { NoteEditorProps } from '../utils/types';

const { buildStyle } = require('lib/theme');

export default function styles(props: NoteEditorProps) {
	return buildStyle(['NoteEditor', props.style.width, props.style.height], props.theme, (theme: any) => {
		return {
			root: {
				...props.style,
				boxSizing: 'border-box',
				paddingLeft: 10,
				paddingTop: 5,
				borderLeftWidth: 1,
				borderLeftColor: theme.dividerColor,
				borderLeftStyle: 'solid',
			},
			titleInput: {
				flex: 1,
				display: 'inline-block',
				paddingTop: 5,
				minHeight: 35,
				boxSizing: 'border-box',
				paddingBottom: 5,
				paddingLeft: 8,
				paddingRight: 8,
				marginLeft: 5,
				// marginRight: theme.paddingLeft,
				color: theme.textStyle.color,
				fontSize: theme.textStyle.fontSize * 1.25,
				backgroundColor: theme.backgroundColor,
				border: '1px solid',
				borderColor: theme.dividerColor,
			},
			warningBanner: {
				background: theme.warningBackgroundColor,
				fontFamily: theme.fontFamily,
				padding: 10,
				fontSize: theme.fontSize,
				marginTop: 5,
				marginBottom: 5,
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
			resourceWatchBanner: {
				...theme.textStyle,
				padding: 10,
				marginLeft: 5,
				marginBottom: 10,
				color: theme.colorWarn,
				backgroundColor: theme.warningBackgroundColor,
			},
			resourceWatchBannerLine: {
				marginTop: 0,
				marginBottom: 10,
			},
		};
	});
}
