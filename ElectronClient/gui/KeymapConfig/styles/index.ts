const { buildStyle } = require('lib/theme');

export default function styles(themeId: number) {
	return buildStyle('KeymapConfigScreen', themeId, (theme: any) => {
		return {
			container: {
				...theme.containerStyle,
				padding: 16,
			},
			actionsContainer: {
				display: 'flex',
				flexDirection: 'row',
			},
			recorderContainer: {
				padding: 2,
			},
			filterInput: {
				...theme.inputStyle,
				flexGrow: 1,
			},
			recorderInput: {
				...theme.inputStyle,
				minHeight: 29,
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
				cursor: 'pointer',
			},
			tableCellShortcut: {
				flexGrow: 1,
			},
			tableCellStatus: {
				// No specific styling at the moment
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
				marginLeft: 8,
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
