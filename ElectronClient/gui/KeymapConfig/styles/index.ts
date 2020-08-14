const { buildStyle } = require('lib/theme');

export default function styles(theme: number) {
	return buildStyle('KeymapConfigScreen', theme, (theme: any) => {
		return {
			container: {
				...theme.containerStyle,
				padding: 16,
			},
			topActions: {
				display: 'flex',
				flexDirection: 'row',
			},
			text: {
				...theme.textStyle,
			},
			input: {
				...theme.inputStyle,
			},
			filterInput: {
				...theme.inputStyle,
				flexGrow: 1,
				minHeight: theme.buttonStyle.minHeight,
			},
			inlineButton: {
				...theme.buttonStyle,
				marginLeft: 12,
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
				marginTop: 15,
				overflow: 'auto',
				width: '100%',
			},
			tableShortcutColumn: {
				...theme.textStyle,
				width: '65%',
			},
			tableCommandColumn: {
				...theme.textStyle,
				width: 'auto',
			},
			tableRow: {
				minHeight: 25,
			},
		};
	});
}
