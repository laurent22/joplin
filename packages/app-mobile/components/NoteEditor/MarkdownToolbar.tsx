// A toolbar for the markdown editor.

const React = require('react');
const { StyleSheet } = require('react-native');
const {
	ScrollView, View, Text, TouchableHighlight, useWindowDimensions, Component,
} = require('react-native');
const { useMemo, useState, useCallback } = require('react');

// See https://oblador.github.io/react-native-vector-icons/ for a list of
// available icons.
const AntIcon = require('react-native-vector-icons/AntDesign').default;
const FontAwesomeIcon = require('react-native-vector-icons/FontAwesome5').default;
const MaterialIcon = require('react-native-vector-icons/MaterialIcons').default;

import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import { useEffect } from 'react';
import { AccessibilityInfo, Keyboard, ViewStyle } from 'react-native';
import { EditorControl, EditorSettings, ListType, SearchState } from './types';
import SelectionFormatting from './SelectionFormatting';

type ButtonComponent = typeof Component;
type ClickListener = ()=> void;

interface ToolbarStyleData {
	styleSheet: any;
}

interface ButtonSpec {
	// Either text that will be shown in place of an icon or a component.
	icon: string | typeof View;
	accessibilityLabel: string;
	onClick: ClickListener;

	// True if the button is connected to an enabled action.
	// E.g. the cursor is in a header and the button is a header button.
	active?: boolean;
	disabled?: boolean;
}

interface ButtonGroup {
	title: string;
	items: ButtonSpec[];
}

interface ToolbarButtonProps {
	styles: ToolbarStyleData;
	spec: ButtonSpec;
	onActionComplete?: ()=> void;
}

const ToolbarButton = ({ styles, spec, onActionComplete }: ToolbarButtonProps) => {
	const styleSheet = styles.styleSheet;
	const disabled = spec.disabled ?? false;

	// Additional styles if activated
	const activatedStyle = spec.active ? styleSheet.buttonActive : {};
	const activatedTextStyle = spec.active ? styleSheet.buttonActiveContent : {};
	const disabledStyle = disabled ? styleSheet.buttonDisabled : {};
	const disabledTextStyle = disabled ? styleSheet.buttonDisabledContent : {};

	let content;

	if (typeof spec.icon === 'string') {
		content = (
			<Text style={{ ...styleSheet.text, ...activatedTextStyle, ...disabledTextStyle }}>
				{spec.icon}
			</Text>
		);
	} else {
		content = spec.icon;
	}

	const onPress = useCallback(() => {
		if (!disabled) {
			spec.onClick();
			onActionComplete?.();
		}
	}, [disabled, spec.onClick, onActionComplete]);

	return (
		<TouchableHighlight
			style={{ ...styleSheet.button, ...activatedStyle, ...disabledStyle }}
			onPress={onPress}
			accessibilityLabel={ spec.accessibilityLabel }
			accessibilityRole="button"
			disabled={ disabled }
		>
			{ content }
		</TouchableHighlight>
	);
};

type OnToggleOverflowCallback = ()=> void;
interface ToggleOverflowButtonProps {
	overflowVisible: boolean;
	onToggleOverflowVisible: OnToggleOverflowCallback;
	styles: ToolbarStyleData;
}

// Button that shows/hides the overflow menu.
const ToggleOverflowButton = (props: ToggleOverflowButtonProps) => {
	const spec: ButtonSpec = {
		icon: (
			<MaterialIcon name="more-horiz" style={props.styles.styleSheet.text}/>
		),
		accessibilityLabel:
			props.overflowVisible ? _('Hide more actions') : _('Show more actions'),
		active: props.overflowVisible,
		onClick: props.onToggleOverflowVisible,
	};

	return (
		<ToolbarButton
			styles={props.styles}
			spec={spec}
		/>
	);
};

interface OverflowPopupProps {
	buttonGroups: ButtonGroup[];
	styles: ToolbarStyleData;
	visible: boolean;

	// Should be created using useCallback
	onToggleOverflow: OnToggleOverflowCallback;
}

// Displays all buttons in [props.buttonGroups] if [props.visible].
// Otherwise, displays nothing.
const OverflowRows = (props: OverflowPopupProps) => {
	const overflowRows: ButtonComponent[] = [];

	let key = 0;
	for (let i = 0; i < props.buttonGroups.length; i++) {
		key++;
		const row: ButtonComponent[] = [];

		const group = props.buttonGroups[i];
		for (let j = 0; j < group.items.length; j++) {
			key++;

			const buttonSpec = group.items[j];
			row.push(
				<ToolbarButton
					key={key.toString()}
					styles={props.styles}
					spec={buttonSpec}

					// After invoking this button's action, hide the overflow menu
					onActionComplete={props.onToggleOverflow}
				/>
			);

			// Show the "hide overflow" button if in the center of the last row
			const isLastRow = i === props.buttonGroups.length - 1;
			const isCenterOfRow = j + 1 === Math.floor(group.items.length / 2);
			if (isLastRow && isCenterOfRow) {
				row.push(
					<ToggleOverflowButton
						key={(++key).toString()}
						styles={props.styles}
						overflowVisible={true}
						onToggleOverflowVisible={props.onToggleOverflow}
					/>
				);
			}
		}

		overflowRows.push(
			<View
				key={key.toString()}
			>
				<ScrollView
					horizontal={true}
					contentContainerStyle={props.styles.styleSheet.toolbarContent}
				>
					{row}
				</ScrollView>
			</View>
		);
	}

	if (!props.visible) {
		return null;
	}

	return (
		<View style={{
			height: props.buttonGroups.length * buttonSize,
			flexDirection: 'column',
		}}>
			{overflowRows}
		</View>
	);
};

interface ToolbarProps {
	buttons: ButtonGroup[];
	styles: ToolbarStyleData;
}

const buttonSize = 56;

// Displays a list of buttons with an overflow menu.
const Toolbar = (props: ToolbarProps) => {
	const [overflowButtonsVisible, setOverflowPopupVisible] = useState(false);

	const allButtonSpecs = props.buttons.reduce((accumulator: ButtonSpec[], current: ButtonGroup) => {
		return accumulator.concat(...current.items);
	}, []);

	const { width: winWidth } = useWindowDimensions();
	const maxButtons = Math.floor(winWidth / buttonSize);
	const maxButtonsEachSide = Math.floor(
		Math.min((maxButtons - 1) / 2, allButtonSpecs.length / 2)
	) - 1;

	const allButtonComponents: ButtonComponent[] = [];
	let key = 0;
	for (const spec of allButtonSpecs) {
		key++;
		allButtonComponents.push(
			<ToolbarButton
				key={key.toString()}
				styles={props.styles}
				spec={spec}
			/>
		);
	}

	const onToggleOverflowVisible = useCallback(() => {
		AccessibilityInfo.announceForAccessibility(
			!overflowButtonsVisible
				? _('Opened toolbar overflow menu')
				: _('Closed toolbar overflow menu')
		);
		setOverflowPopupVisible(!overflowButtonsVisible);
	}, [overflowButtonsVisible]);

	const toggleOverflowButton = (
		<ToggleOverflowButton
			key={(++key).toString()}
			styles={props.styles}
			overflowVisible={overflowButtonsVisible}
			onToggleOverflowVisible={onToggleOverflowVisible}
		/>
	);

	const mainButtons: ButtonComponent[] = [];
	if (maxButtons < allButtonComponents.length) {
		// We want the menu to look something like this:
		// 			B I (…) 🔍 ⌨
		// where (…) shows/hides overflow.
		// Add from the left and right of [allButtonComponents] to ensure that
		// the (…) button is in the center:
		mainButtons.push(...allButtonComponents.slice(0, maxButtonsEachSide));
		mainButtons.push(toggleOverflowButton);
		mainButtons.push(...allButtonComponents.slice(-maxButtonsEachSide));
	} else {
		mainButtons.push(...allButtonComponents);
	}

	const mainButtonRow = (
		<View style={props.styles.styleSheet.toolbarRow}>
			{!overflowButtonsVisible ? mainButtons : null }
		</View>
	);

	return (
		<View style={props.styles.styleSheet.toolbarContainer}>
			<ScrollView>
				<OverflowRows
					buttonGroups={props.buttons}
					styles={props.styles}
					visible={overflowButtonsVisible}
					onToggleOverflow={onToggleOverflowVisible}
				/>
				{ !overflowButtonsVisible ? mainButtonRow : null }
			</ScrollView>
		</View>
	);
};

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

			// This hook is executed the same number of times for each call
			// of MarkdownToolbar.
			// eslint-disable-next-line react-hooks/rules-of-hooks
			onClick: useCallback(() => {
				editorControl.toggleHeaderLevel(level);
			}, [editorControl]),
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
		onClick: useCallback(() => {
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
		onClick: useCallback(() => {
			editorControl.toggleList(ListType.OrderedList);
		}, [editorControl]),
	});

	listButtons.push({
		icon: (
			<FontAwesomeIcon name="tasks" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inChecklist ? _('Remove task list') : _('Create task list'),
		active: selState.inChecklist,
		onClick: useCallback(() => {
			editorControl.toggleList(ListType.CheckList);
		}, [editorControl]),
	});


	listButtons.push({
		icon: (
			<AntIcon name="indent-left" style={styles.text}/>
		),
		accessibilityLabel: _('Decrease indent level'),
		onClick: editorControl.decreaseIndent,
	});

	listButtons.push({
		icon: (
			<AntIcon name="indent-right" style={styles.text}/>
		),
		accessibilityLabel: _('Increase indent level'),
		onClick: editorControl.increaseIndent,
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
		onClick: editorControl.toggleBolded,
	});

	inlineFormattingBtns.push({
		icon: (
			<FontAwesomeIcon name="italic" style={styles.text}/>
		),
		accessibilityLabel:
			selState.italicized ? _('Unitalicize') : _('Italicize'),
		active: selState.italicized,
		onClick: editorControl.toggleItalicized,
	});

	inlineFormattingBtns.push({
		icon: '{;}',
		accessibilityLabel:
			selState.inCode ? _('Remove code formatting') : _('Format as code'),
		active: selState.inCode,
		onClick: editorControl.toggleCode,
	});

	if (props.editorSettings.katexEnabled) {
		inlineFormattingBtns.push({
			icon: '∑',
			accessibilityLabel:
				selState.inMath ? _('Remove TeX region') : _('Create TeX region'),
			active: selState.inMath,
			onClick: editorControl.toggleMath,
		});
	}

	inlineFormattingBtns.push({
		icon: (
			<FontAwesomeIcon name="link" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inLink ? _('Edit link') : _('Create link'),
		active: selState.inLink,
		onClick: editorControl.showLinkDialog,
	});


	// Actions
	const actionButtons: ButtonSpec[] = [];
	actionButtons.push({
		icon: (
			<FontAwesomeIcon name="calendar-plus" style={styles.text}/>
		),
		accessibilityLabel: _('Insert time'),
		onClick: useCallback(() => {
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
		onClick: useCallback(() => {
			editorControl.setSpellcheckEnabled(!props.selectionState.spellChecking);
		}, [editorControl]),
	});

	actionButtons.push({
		icon: (
			<MaterialIcon name="search" style={styles.text}/>
		),
		accessibilityLabel: _('Find and replace'),
		active: props.searchState.dialogVisible,
		onClick: useCallback(() => {
			if (props.searchState.dialogVisible) {
				editorControl.searchControl.hideSearch();
			} else {
				editorControl.searchControl.showSearch();
			}
		}, [editorControl]),
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
		onClick: onToggleKeyboard,
	});

	return (
		<Toolbar
			styles={{ styleSheet: styles }}
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

const useStyles = (styleProps: any, theme: any) => {
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
			},
			toolbarContent: {
				flexGrow: 1,
				justifyContent: 'center',
			},
		});
	}, [styleProps, theme]);
};

export default MarkdownToolbar;
