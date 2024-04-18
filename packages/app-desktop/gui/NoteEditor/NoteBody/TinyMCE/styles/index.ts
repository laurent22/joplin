import { ThemeAppearance } from '@joplin/lib/themes/type';
import { NoteBodyEditorProps } from '../../../utils/types';
import { buildStyle } from '@joplin/lib/theme';

export default function styles(props: NoteBodyEditorProps) {
	const leftExtraToolbarContainerWidth = props.watchedNoteFiles.length > 0 ? 120 : 80;
	return buildStyle(['TinyMCE', props.style.width, props.style.height, leftExtraToolbarContainerWidth], props.themeId, theme => {
		const extraToolbarContainer = {
			boxSizing: 'content-box',
			backgroundColor: theme.backgroundColor3,
			display: 'flex',
			flexDirection: 'row',
			position: 'absolute',
			height: theme.toolbarHeight,
			zIndex: 2,
			top: 0,
			padding: theme.toolbarPadding,
		};

		return {
			disabledOverlay: {
				zIndex: 10,
				position: 'absolute',
				backgroundColor: theme.backgroundColor,
				opacity: theme.appearance === ThemeAppearance.Light ? 0.7 : 0.9,
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
				width: leftExtraToolbarContainerWidth,
				left: 0,
			},
			rightExtraToolbarContainer: {
				...extraToolbarContainer,
				alignItems: 'center',
				justifyContent: 'flex-end',
				width: 70,
				right: 0,
				paddingRight: theme.mainPadding,
			},
			extraToolbarButton: {
				display: 'flex',
				border: 'none',
				background: 'none',
			},
			extraToolbarButtonIcon: {
				fontSize: theme.toolbarIconSize,
				color: theme.color3,
			},
		};
	});
}
