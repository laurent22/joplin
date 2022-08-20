// A toolbar for the markdown editor.

const React = require('react');
import { StyleSheet } from 'react-native';
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
import { EditorControl, EditorSettings, ListType, SearchState } from '../types';
import SelectionFormatting from '../SelectionFormatting';
import { ButtonSpec } from './types';
import Toolbar from './Toolbar';
import { buttonSize } from './ToolbarButton';
import { Theme } from '@joplin/lib/themes/type';

interface MarkdownToolbarProps {
	editorControl: EditorControl;
	selectionState: SelectionFormatting;
	searchState: SearchState;
	editorSettings: EditorSettings;
	style?: ViewStyle;
}

const MarkdownToolbar = (props: MarkdownToolbarProps) => {
	const themeData = props.editorSettings.themeData;
	const styles = useStyles(props.style, themeData);
	const selState = props.selectionState;
	const editorControl = props.editorControl;

	const headerButtons: ButtonSpec[] = [];
	for (let level = 1; level <= 5; level++) {
		const active = selState.headerLevel === level;
		let label;
		if (!active) {
			label = _('Create header level %d', level);
		} else {
			label = _('Remove level %d header', level);
		}

		headerButtons.push({
			icon: `H${level}`,
			accessibilityLabel: label,
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
		});
	}

	const listButtons: ButtonSpec[] = [];
	listButtons.push({
		icon: (
			<FontAwesomeIcon name="list-ul" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inUnorderedList ? _('Remove unordered list') : _('Create unordered list'),
		active: selState.inUnorderedList,
		onPress: useCallback(() => {
			editorControl.toggleList(ListType.UnorderedList);
		}, [editorControl]),
	});

	listButtons.push({
		icon: (
			<FontAwesomeIcon name="list-ol" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inOrderedList ? _('Remove ordered list') : _('Create ordered list'),
		active: selState.inOrderedList,
		onPress: useCallback(() => {
			editorControl.toggleList(ListType.OrderedList);
		}, [editorControl]),

		priority: -1,
	});

	listButtons.push({
		icon: (
			<FontAwesomeIcon name="tasks" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inChecklist ? _('Remove task list') : _('Create task list'),
		active: selState.inChecklist,
		onPress: useCallback(() => {
			editorControl.toggleList(ListType.CheckList);
		}, [editorControl]),

		priority: -1,
	});


	listButtons.push({
		icon: (
			<AntIcon name="indent-left" style={styles.text}/>
		),
		accessibilityLabel: _('Decrease indent level'),
		onPress: editorControl.decreaseIndent,
	});

	listButtons.push({
		icon: (
			<AntIcon name="indent-right" style={styles.text}/>
		),
		accessibilityLabel: _('Increase indent level'),
		onPress: editorControl.increaseIndent,
	});


	// Inline formatting
	const inlineFormattingBtns: ButtonSpec[] = [];
	inlineFormattingBtns.push({
		icon: (
			<FontAwesomeIcon name="bold" style={styles.text}/>
		),
		accessibilityLabel:
			selState.bolded ? _('Unbold') : _('Bold text'),
		active: selState.bolded,
		onPress: editorControl.toggleBolded,

		priority: 3,
	});

	inlineFormattingBtns.push({
		icon: (
			<FontAwesomeIcon name="italic" style={styles.text}/>
		),
		accessibilityLabel:
			selState.italicized ? _('Unitalicize') : _('Italicize'),
		active: selState.italicized,
		onPress: editorControl.toggleItalicized,

		priority: 2,
	});

	inlineFormattingBtns.push({
		icon: '{;}',
		accessibilityLabel:
			selState.inCode ? _('Remove code formatting') : _('Format as code'),
		active: selState.inCode,
		onPress: editorControl.toggleCode,

		priority: 2,
	});

	if (props.editorSettings.katexEnabled) {
		inlineFormattingBtns.push({
			icon: '∑',
			accessibilityLabel:
				selState.inMath ? _('Remove TeX region') : _('Create TeX region'),
			active: selState.inMath,
			onPress: editorControl.toggleMath,

			priority: 1,
		});
	}

	inlineFormattingBtns.push({
		icon: (
			<FontAwesomeIcon name="link" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inLink ? _('Edit link') : _('Create link'),
		active: selState.inLink,
		onPress: editorControl.showLinkDialog,

		priority: -2,
	});


	// Actions
	const actionButtons: ButtonSpec[] = [];
	actionButtons.push({
		icon: (
			<FontAwesomeIcon name="calendar-plus" style={styles.text}/>
		),
		accessibilityLabel: _('Insert time'),
		onPress: useCallback(() => {
			editorControl.insertText(time.formatDateToLocal(new Date()));
		}, [editorControl]),
	});

	actionButtons.push({
		icon: (
			<MaterialIcon name="spellcheck" style={styles.text}/>
		),
		accessibilityLabel:
			props.selectionState.spellChecking ? _('Check spelling') : _('Stop checking spelling'),
		active: props.selectionState.spellChecking,
		disabled: props.selectionState.unspellCheckableRegion,
		onPress: useCallback(() => {
			editorControl.setSpellcheckEnabled(!props.selectionState.spellChecking);
		}, [editorControl, props.selectionState.spellChecking]),
	});

	actionButtons.push({
		icon: (
			<MaterialIcon name="search" style={styles.text}/>
		),
		accessibilityLabel: _('Find and replace'),
		active: props.searchState.dialogVisible,
		onPress: useCallback(() => {
			if (props.searchState.dialogVisible) {
				editorControl.searchControl.hideSearch();
			} else {
				editorControl.searchControl.showSearch();
			}
		}, [editorControl, props.searchState.dialogVisible]),

		priority: -2,
	});

	const [keyboardVisible, setKeyboardVisible] = useState(false);
	useEffect(() => {
		const showListener = Keyboard.addListener('keyboardDidShow', () => {
			setKeyboardVisible(true);
		});
		const hideListener = Keyboard.addListener('keyboardDidHide', () => {
			setKeyboardVisible(false);
		});

		return (() => {
			showListener.remove();
			hideListener.remove();
		});
	});

	const onToggleKeyboard = useCallback(() => {
		// Keyboard.dismiss() doesn't dismiss the keyboard if it's editing the WebView.
		Keyboard.dismiss();

		// As such, dismiss the keyboard by sending a message to the View.
		editorControl.hideKeyboard();
	}, [editorControl]);

	actionButtons.push({
		icon: (
			<MaterialIcon name="keyboard-hide" style={styles.text}/>
		),
		accessibilityLabel: _('Hide keyboard'),
		disabled: !keyboardVisible,
		onPress: onToggleKeyboard,

		priority: -2,
	});

	return (
		<Toolbar
			styleSheet={styles}
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
	);
};

const useStyles = (styleProps: any, theme: Theme) => {
	return useMemo(() => {
		return StyleSheet.create({
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
				height: buttonSize,

				...styleProps,
			},
			toolbarContainer: {
				maxHeight: '65%',
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
