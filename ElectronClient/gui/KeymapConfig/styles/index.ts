import { KeymapConfigScreenProps } from '../KeymapConfigScreen';

const { buildStyle } = require('lib/theme');

export default function styles(props: KeymapConfigScreenProps) {
	return buildStyle('KeymapConfigScreen', props.theme, (theme: any) => {
		return {
			containerStyle: {
				...theme.containerStyle,
				padding: 10,
				overflow: 'auto',
			},
			topActionsStyle: {
				...theme.containerStyle,
				marginTop: 10,
				display: 'flex',
				flexDirection: 'row',
			},
			inlineButtonStyle: {
				...theme.buttonStyle,
				height: theme.inputStyle.height,
				padding: 0,
				marginLeft: 12,
			},
			filterInputStyle: {
				...theme.inputStyle,
				flexGrow: 1,
			},
			tableStyle: {
				...theme.containerStyle,
				marginTop: 10,
				overflow: 'auto',
				width: '100%',
			},
			textStyle: {
				...theme.textStyle,
			},
		};
	});
}
