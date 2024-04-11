import { NoteEditorProps } from '../utils/types';

import { buildStyle } from '@joplin/lib/theme';

export default function styles(props: NoteEditorProps) {
	return buildStyle(['NoteEditor'], props.themeId, theme => {
		return {
			root: {
				boxSizing: 'border-box',
				paddingLeft: 0, // theme.mainPadding,
				paddingTop: 0,
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
				lineHeight: '1.6em',
				marginTop: 5,
				marginBottom: 5,
			},
			warningBannerLink: {
				color: theme.color,
				fontFamily: theme.fontFamily,
				fontSize: theme.fontSize,
				fontWeight: 'bold',
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

				backgroundColor: theme.warningBackgroundColor,
			},
			resourceWatchBannerLine: {
				marginTop: 0,
				marginBottom: 10,
			},
		};
	});
}
