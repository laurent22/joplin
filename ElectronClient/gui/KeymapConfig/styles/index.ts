import { KeymapConfigScreenProps } from '../KeymapConfigScreen';

const { buildStyle } = require('lib/theme');

export default function styles(props: KeymapConfigScreenProps) {
	return buildStyle('KeymapConfigScreen', props.theme, (theme: any) => {
		return {
			containerStyle: {
				...theme.containerStyle,
				padding: 15,
			},
			topActionsStyle: {
				display: 'flex',
				flexDirection: 'row',
			},
			inlineButtonStyle: {
				...theme.buttonStyle,
				padding: 0,
				marginLeft: 12,
			},
			filterInputStyle: {
				...theme.inputStyle,
				flexGrow: 1,
				minHeight: theme.buttonStyle.minHeight,
			},
			tableStyle: {
				...theme.containerStyle,
				marginTop: 15,
				overflow: 'auto',
				width: '100%',
			},
			tableShortcutColumnStyle: {
				...theme.textStyle,
				width: '65%',
			},
			tableCommandColumnStyle: {
				...theme.textStyle,
				width: 'auto',
			},
			tableRowStyle: {
				minHeight: 25,
			},
			textStyle: {
				...theme.textStyle,
			},
			inputStyle: {
				...theme.inputStyle,
			},
		};
	});
}
