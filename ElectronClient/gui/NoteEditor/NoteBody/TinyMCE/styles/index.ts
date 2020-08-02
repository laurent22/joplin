import { NoteBodyEditorProps } from '../../../utils/types';
const { buildStyle } = require('lib/theme');

export default function styles(props:NoteBodyEditorProps) {
	return buildStyle(['TinyMCE', props.style.width, props.style.height], props.theme, () => {
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
		};
	});
}
