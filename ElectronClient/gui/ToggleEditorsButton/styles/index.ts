import { Props, Value } from '../ToggleEditorsButton';
const { buildStyle } = require('lib/theme');

export default function styles(props:Props) {
	return buildStyle(['ToggleEditorsButton', props.value], props.theme, (theme: any) => {
		const innerButton:any = {
			borderStyle: 'solid',
			borderColor: theme.color3,
			borderWidth: 1,
			borderRadius: 0,
			width: 34,
			height: 22,
			display: 'flex',
			justifyContent: 'center',
		};

		const output:any = {
			button: {
				border: 'none',
				padding: 0,
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				background: 'none',
			},
			leftInnerButton: {
				...innerButton,
				borderTopLeftRadius: 4,
				borderBottomLeftRadius: 4,
			},
			rightInnerButton: {
				...innerButton,
				borderTopRightRadius: 4,
				borderBottomRightRadius: 4,
			},
			leftIcon: {
				fontSize: 16,
				position: 'relative',
				top: 3,
				color: theme.color3,
			},
			rightIcon: {
				fontSize: 14,
				borderLeft: 'none',
				position: 'relative',
				top: 4,
				color: theme.color3,
			},
		};

		if (props.value === Value.Markdown) {
			output.leftInnerButton.backgroundColor = theme.color3;
			output.leftIcon.color = theme.backgroundColor3;
			output.rightInnerButton.opacity = 0.5;
		} else if (props.value === Value.RichText) {
			output.rightInnerButton.backgroundColor = theme.color3;
			output.rightIcon.color = theme.backgroundColor3;
			output.leftInnerButton.opacity = 0.5;
		}

		return output;
	});
}
