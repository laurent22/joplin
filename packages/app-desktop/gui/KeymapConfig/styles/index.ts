import { ThemeStyle } from '@joplin/lib/theme';

const { buildStyle } = require('@joplin/lib/theme');

export default function styles(themeId: number) {
	return buildStyle('KeymapConfigScreen', themeId, (theme: ThemeStyle) => {
		return {
			container: {
				...theme.containerStyle,
				// padding: theme.configScreenPadding,
				backgroundColor: theme.backgroundColor3,
			},
			actionsContainer: {
				display: 'flex',
				flexDirection: 'row',
			},
			recorderContainer: {
				padding: 2,
				flexGrow: 1,
			},
			filterInput: {
				...theme.inputStyle,
				flexGrow: 1,
				minHeight: 29,
				alignSelf: 'center',
			},
			recorderInput: {
				...theme.inputStyle,
				minHeight: 29,
				width: '200px',
			},
			label: {
				...theme.textStyle,
				alignSelf: 'center',
				marginRight: 10,
			},
			table: {
				...theme.containerStyle,
				marginTop: 16,
				overflow: 'auto',
				width: '100%',
			},
			tableShortcutColumn: {
				...theme.textStyle,
				width: '60%',
			},
			tableCommandColumn: {
				...theme.textStyle,
				width: 'auto',
			},
			tableCell: {
				display: 'flex',
				flexDirection: 'row',
			},
			tableCellContent: {
				flexGrow: 1,
				alignSelf: 'center',
			},
			tableCellStatus: {
				height: '100%',
				alignSelf: 'center',
			},
			kbd: {
				fontFamily: 'sans-serif',
				border: '1px solid',
				borderRadius: 4,
				backgroundColor: theme.raisedBackgroundColor,
				padding: 2,
				paddingLeft: 6,
				paddingRight: 6,
			},
			disabled: {
				color: theme.colorFaded,
				fontStyle: 'italic',
			},
			inlineButton: {
				...theme.buttonStyle,
				marginLeft: 12,
			},
			warning: {
				...theme.textStyle,
				backgroundColor: theme.warningBackgroundColor,
				paddingLeft: 16,
				paddingRight: 16,
				paddingTop: 2,
				paddingBottom: 2,
			},
		};
	});
}
