import { NoteBodyEditorProps } from '../../../utils/types';
const { buildStyle } = require('lib/theme');

export default function styles(props:NoteBodyEditorProps) {
	return buildStyle(['TinyMCE', props.style.width, props.style.height], props.theme, (theme:any) => {
		const extraToolbarContainer = {
			backgroundColor: theme.backgroundColor3,
			display: 'flex',
			flexDirection: 'row',
			position: 'absolute',
			height: 39,
			zIndex: 2,
			top: 0,
		};

		return {
			disabledOverlay: {
				zIndex: 10,
				position: 'absolute',
				backgroundColor: 'white',
				opacity: 0.7,
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				padding: 20,
				paddingTop: 50,
				textAlign: 'center',
				width: '100%',
			},
			rootStyle: {
				position: 'relative',
				width: props.style.width,
				height: props.style.height,
			},
			leftExtraToolbarContainer: {
				...extraToolbarContainer,
				width: 100,
				left: 4,
			},
			rightExtraToolbarContainer: {
				...extraToolbarContainer,
				alignItems: 'center',
				justifyContent: 'flex-end',
				width: 160,
				right: 0,
			},
			extraToolbarButton: {
				display: 'flex',
				border: 'none',
				background: 'none',
			},
			extraToolbarButtonIcon: {
				fontSize: 24,
				color: theme.color3,
			},
		};
	});
}
