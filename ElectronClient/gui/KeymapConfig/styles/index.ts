const { buildStyle } = require('lib/theme');

export default function styles(themeId: number) {
	return buildStyle('KeymapConfigScreen', themeId, (theme: any) => {
		return {
			container: {
				...theme.containerStyle,
				padding: 16,
			},
			text: {
				...theme.textStyle,
			},
			input: {
				...theme.inputStyle,
			},
			topActions: {
				display: 'flex',
				flexDirection: 'row',
			},
			filterInput: {
				...theme.inputStyle,
				flexGrow: 1,
			},
			shortcutInput: {
				...theme.inputStyle,
			},
			inlineButton: {
				...theme.buttonStyle,
				marginLeft: 8,
			},
			warning: {
				backgroundColor: theme.warningBackgroundColor,
				paddingLeft: 10,
				paddingRight: 10,
				paddingTop: 2,
				paddingBottom: 2,
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
		};
	});
}
