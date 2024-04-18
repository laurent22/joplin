import { Props, Value } from '../ToggleEditorsButton';
import { buildStyle } from '@joplin/lib/theme';

export default function styles(props: Props) {
	return buildStyle(['ToggleEditorsButton', props.value], props.themeId, theme => {
		const iconSize = 15;
		const mdIconWidth = iconSize * 1.25;
		const buttonHeight = theme.toolbarHeight - 7;
		const mdIconPadding = Math.round((buttonHeight - iconSize) / 2) + 3;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const innerButton: any = {
			borderStyle: 'solid',
			borderColor: theme.color3,
			borderWidth: 1,
			borderRadius: 0,
			width: mdIconWidth + mdIconPadding * 2,
			height: buttonHeight,
			display: 'flex',
			justifyContent: 'center',
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const output: any = {
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
				fontSize: iconSize,
				position: 'relative',
				top: 1,
				color: theme.color3,
			},
			rightIcon: {
				fontSize: iconSize - 1,
				borderLeft: 'none',
				position: 'relative',
				top: 1,
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
