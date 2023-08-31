// A toolbar for the markdown editor.

const React = require('react');
import { Platform, StyleSheet } from 'react-native';
import { useMemo, useState, useCallback } from 'react';

// See https://oblador.github.io/react-native-vector-icons/ for a list of
// available icons.
const AntIcon = require('react-native-vector-icons/AntDesign').default;
const FontAwesomeIcon = require('react-native-vector-icons/FontAwesome5').default;
const MaterialIcon = require('react-native-vector-icons/MaterialIcons').default;

import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import { useEffect } from 'react';
import { Keyboard, ViewStyle } from 'react-native';
import { EditorControl, EditorSettings } from '../types';
import { ButtonSpec, StyleSheetData } from './types';
import Toolbar from './Toolbar';
import { buttonSize } from './ToolbarButton';
import { Theme } from '@joplin/lib/themes/type';
import ToggleSpaceButton from './ToggleSpaceButton';
import { ListType, SearchState } from '@joplin/editor/types';
import SelectionFormatting from '@joplin/editor/SelectionFormatting';

type OnAttachCallback = ()=> void;

interface MarkdownToolbarProps {
	editorControl: EditorControl;
	selectionState: SelectionFormatting;
	searchState: SearchState;
	editorSettings: EditorSettings;
	onAttach: OnAttachCallback;
	style?: ViewStyle;
	readOnly: boolean;
}

const MarkdownToolbar = (props: MarkdownToolbarProps) => {
	const themeData = props.editorSettings.themeData;
	const styles = useStyles(props.style, themeData);
	const selState = props.selectionState;
	const editorControl = props.editorControl;
	const readOnly = props.readOnly;

	const headerButtons: ButtonSpec[] = [];
	for (let level = 1; level <= 5; level++) {
		const active = selState.headerLevel === level;

		headerButtons.push({
			icon: `H${level}`,
			description: _('Header %d', level),
			active,

			// We only call addHeaderButton 5 times and in the same order, so
			// the linter error is safe to ignore.
			// eslint-disable-next-line @seiyab/react-hooks/rules-of-hooks
			onPress: useCallback(() => {
				editorControl.toggleHeaderLevel(level);
			}, [editorControl, level]),

			// Make it likely for the first three header buttons to show, less likely for
			// the others.
			priority: level < 3 ? 2 : 0,
			disabled: readOnly,
		});
	}

	const listButtons: ButtonSpec[] = [];
	listButtons.push({
		icon: (
			<FontAwesomeIcon name="list-ul" style={styles.text}/>
		),
		description: _('Unordered list'),
		active: selState.inUnorderedList,
		onPress: useCallback(() => {
			editorControl.toggleList(ListType.UnorderedList);
		}, [editorControl]),

		priority: -2,
		disabled: readOnly,
	});

	listButtons.push({
		icon: (
			<FontAwesomeIcon name="list-ol" style={styles.text}/>
		),
		description: _('Ordered list'),
		active: selState.inOrderedList,
		onPress: useCallback(() => {
			editorControl.toggleList(ListType.OrderedList);
		}, [editorControl]),

		priority: -2,
		disabled: readOnly,
	});

	listButtons.push({
		icon: (
			<FontAwesomeIcon name="tasks" style={styles.text}/>
		),
		description: _('Task list'),
		active: selState.inChecklist,
		onPress: useCallback(() => {
			editorControl.toggleList(ListType.CheckList);
		}, [editorControl]),

		priority: -2,
		disabled: readOnly,
	});


	listButtons.push({
		icon: (
			<AntIcon name="indent-left" style={styles.text}/>
		),
		description: _('Decrease indent level'),
		onPress: editorControl.decreaseIndent,

		priority: -1,
		disabled: readOnly,
	});

	listButtons.push({
		icon: (
			<AntIcon name="indent-right" style={styles.text}/>
		),
		description: _('Increase indent level'),
		onPress: editorControl.increaseIndent,

		priority: -1,
		disabled: readOnly,
	});


	// Inline formatting
	const inlineFormattingBtns: ButtonSpec[] = [];
	inlineFormattingBtns.push({
		icon: (
			<FontAwesomeIcon name="bold" style={styles.text}/>
		),
		description: _('Bold'),
		active: selState.bolded,
		onPress: editorControl.toggleBolded,

		priority: 3,
		disabled: readOnly,
	});

	inlineFormattingBtns.push({
		icon: (
			<FontAwesomeIcon name="italic" style={styles.text}/>
		),
		description: _('Italic'),
		active: selState.italicized,
		onPress: editorControl.toggleItalicized,

		priority: 2,
		disabled: readOnly,
	});

	inlineFormattingBtns.push({
		icon: '{;}',
		description: _('Code'),
		active: selState.inCode,
		onPress: editorControl.toggleCode,

		priority: 2,
		disabled: readOnly,
	});

	if (props.editorSettings.katexEnabled) {
		inlineFormattingBtns.push({
			icon: '∑',
			description: _('KaTeX'),
			active: selState.inMath,
			onPress: editorControl.toggleMath,

			priority: 1,
			disabled: readOnly,
		});
	}

	inlineFormattingBtns.push({
		icon: (
			<FontAwesomeIcon name="link" style={styles.text}/>
		),
		description: _('Link'),
		active: selState.inLink,
		onPress: editorControl.showLinkDialog,

		priority: -3,
		disabled: readOnly,
	});


	// Actions
	const actionButtons: ButtonSpec[] = [];
	actionButtons.push({
		icon: (
			<FontAwesomeIcon name="calendar-plus" style={styles.text}/>
		),
		description: _('Insert time'),
		onPress: useCallback(() => {
			editorControl.insertText(time.formatDateToLocal(new Date()));
		}, [editorControl]),
		disabled: readOnly,
	});

	const onDismissKeyboard = useCallback(() => {
		// Keyboard.dismiss() doesn't dismiss the keyboard if it's editing the WebView.
		Keyboard.dismiss();

		// As such, dismiss the keyboard by sending a message to the View.
		editorControl.hideKeyboard();
	}, [editorControl]);

	actionButtons.push({
		icon: (
			<MaterialIcon name="attachment" style={styles.text}/>
		),
		description: _('Attach'),
		onPress: useCallback(() => {
			onDismissKeyboard();
			props.onAttach();
		}, [props.onAttach, onDismissKeyboard]),
		disabled: readOnly,
	});

	actionButtons.push({
		icon: (
			<MaterialIcon name="search" style={styles.text}/>
		),
		description: (
			props.searchState.dialogVisible ? _('Close') : _('Find and replace')
		),
		active: props.searchState.dialogVisible,
		onPress: useCallback(() => {
			if (props.searchState.dialogVisible) {
				editorControl.searchControl.hideSearch();
			} else {
				editorControl.searchControl.showSearch();
			}
		}, [editorControl, props.searchState.dialogVisible]),

		priority: -3,
		disabled: readOnly,
	});

	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const [hasSoftwareKeyboard, setHasSoftwareKeyboard] = useState(false);
	useEffect(() => {
		const showListener = Keyboard.addListener('keyboardDidShow', () => {
			setKeyboardVisible(true);
			setHasSoftwareKeyboard(true);
		});
		const hideListener = Keyboard.addListener('keyboardDidHide', () => {
			setKeyboardVisible(false);
		});

		return (() => {
			showListener.remove();
			hideListener.remove();
		});
	});

	actionButtons.push({
		icon: (
			<MaterialIcon name="keyboard-hide" style={styles.text}/>
		),
		description: _('Hide keyboard'),
		disabled: !keyboardVisible,
		visible: hasSoftwareKeyboard && Platform.OS === 'ios',
		onPress: onDismissKeyboard,

		priority: -3,
	});

	const styleData: StyleSheetData = {
		styles: styles,
		themeId: props.editorSettings.themeId,
	};

	return (
		<ToggleSpaceButton
			spaceApplicable={ Platform.OS === 'ios' && keyboardVisible }
			themeId={props.editorSettings.themeId}
			style={styles.container}
		>
			<Toolbar
				styleSheet={styleData}
				buttons={[
					{
						title: _('Formatting'),
						items: inlineFormattingBtns,
					},
					{
						title: _('Headers'),
						items: headerButtons,
					},
					{
						title: _('Lists'),
						items: listButtons,
					},
					{
						title: _('Actions'),
						items: actionButtons,
					},
				]}
			/>
		</ToggleSpaceButton>
	);
};

const useStyles = (styleProps: any, theme: Theme) => {
	return useMemo(() => {
		return StyleSheet.create({
			container: {
				...styleProps,
			},
			button: {
				width: buttonSize,
				height: buttonSize,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: theme.backgroundColor,
			},
			buttonDisabled: {
				opacity: 0.5,
			},
			buttonDisabledContent: {
			},
			buttonActive: {
				backgroundColor: theme.backgroundColor3,
				color: theme.color3,
				borderWidth: 1,
				borderColor: theme.color3,
				borderRadius: 6,
			},
			buttonActiveContent: {
				color: theme.color3,
			},
			text: {
				fontSize: 22,
				color: theme.color,
			},
			toolbarRow: {
				flex: 0,
				flexDirection: 'row',
				alignItems: 'baseline',
				justifyContent: 'center',

				// Add a small amount of additional padding for button borders
				height: buttonSize + 6,
			},
			toolbarContainer: {
				flexShrink: 1,
			},
			toolbarContent: {
				flexGrow: 1,
				justifyContent: 'center',
			},
		});
	}, [styleProps, theme]);
};

export default MarkdownToolbar;
