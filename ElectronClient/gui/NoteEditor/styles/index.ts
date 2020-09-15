import { NoteEditorProps } from '../utils/types';

const { buildStyle } = require('lib/theme');

export default function styles(props: NoteEditorProps) {
	return buildStyle(['NoteEditor'], props.themeId, (theme: any) => {
		return {
			root: {
				// ...props.style,
				boxSizing: 'border-box',
				paddingLeft: theme.mainPadding,
				paddingTop: 0,
				borderLeftWidth: 1,
				borderLeftColor: theme.dividerColor,
				borderLeftStyle: 'solid',
				width: '100%',
				height: '100%',
			},
			titleInput: {
				flex: 1,
				display: 'inline-block',
				paddingTop: 5,
				minHeight: 35,
				boxSizing: 'border-box',
				fontWeight: 'bold',
				paddingBottom: 5,
				paddingLeft: 0,
				paddingRight: 8,
				marginLeft: 5,
				color: theme.textStyle.color,
				fontSize: Math.round(theme.textStyle.fontSize * 1.5),
				backgroundColor: theme.backgroundColor,
				border: 'none',
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
