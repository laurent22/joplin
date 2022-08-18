// Displays a find/replace dialog

const React = require('react');
const { StyleSheet } = require('react-native');
const { TextInput, View, Text, TouchableOpacity } = require('react-native');
const { useMemo, useState, useEffect } = require('react');
const MaterialCommunityIcon = require('react-native-vector-icons/MaterialCommunityIcons').default;

import { SearchControl, SearchState, EditorSettings } from './types';
import { _ } from '@joplin/lib/locale';
import { BackHandler } from 'react-native';
import { Theme } from '@joplin/lib/themes/type';

const buttonSize = 48;

type OnChangeCallback = (text: string)=> void;
type Callback = ()=> void;

export const defaultSearchState: SearchState = {
	useRegex: false,
	caseSensitive: false,

	searchText: '',
	replaceText: '',
	dialogVisible: false,
};

export interface SearchPanelProps {
    searchControl: SearchControl;
    searchState: SearchState;
    editorSettings: EditorSettings;
}

interface ActionButtonProps {
	styles: any;
	iconName: string;
	title: string;
	onPress: Callback;
}

const ActionButton = (
	props: ActionButtonProps
) => {
	return (
		<TouchableOpacity
			style={props.styles.button}
			onPress={props.onPress}

			accessibilityLabel={props.title}
			accessibilityRole='button'
		>
			<MaterialCommunityIcon name={props.iconName} style={props.styles.buttonText}/>
		</TouchableOpacity>
	);
};

interface ToggleButtonProps {
	styles: any;
	iconName: string;
	title: string;
	active: boolean;
	onToggle: Callback;
}
const ToggleButton = (props: ToggleButtonProps) => {
	const active = props.active;

	return (
		<TouchableOpacity
			style={{
				...props.styles.toggleButton,
				...(active ? props.styles.toggleButtonActive : {}),
			}}
			onPress={props.onToggle}

			accessibilityState={{
				checked: props.active,
			}}
			accessibilityLabel={props.title}
			accessibilityRole='switch'
		>
			<MaterialCommunityIcon name={props.iconName} style={
				active ? props.styles.activeButtonText : props.styles.buttonText
			}/>
		</TouchableOpacity>
	);
};


const useStyles = (theme: Theme) => {
	return useMemo(() => {
		const buttonStyle = {
			width: buttonSize,
			height: buttonSize,
			backgroundColor: theme.backgroundColor4,
			alignItems: 'center',
			justifyContent: 'center',
			flexShrink: 1,
		};
		const buttonTextStyle = {
			color: theme.color4,
			fontSize: 30,
		};

		return StyleSheet.create({
			button: buttonStyle,
			toggleButton: {
				...buttonStyle,
			},
			toggleButtonActive: {
				...buttonStyle,
				backgroundColor: theme.backgroundColor3,
			},
			input: {
				flexGrow: 1,
				height: buttonSize,
				backgroundColor: theme.backgroundColor4,
				color: theme.color4,
			},
			buttonText: buttonTextStyle,
			activeButtonText: {
				...buttonTextStyle,
				color: theme.color4,
			},
			text: {
				color: theme.color,
			},
			labeledInput: {
				flexGrow: 1,
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'center',
				marginLeft: 10,
			},
		});
	}, [theme]);
};

export const SearchPanel = (props: SearchPanelProps) => {
	const placeholderColor = props.editorSettings.themeData.color3;
	const styles = useStyles(props.editorSettings.themeData);

	const [showingAdvanced, setShowAdvanced] = useState(false);

	const state = props.searchState;
	const control = props.searchControl;

	const updateSearchState = (changedData: any) => {
		const newState = Object.assign({}, state, changedData);
		control.setSearchState(newState);
	};

	// Creates a TextInut with the given parameters
	const createInput = (
		placeholder: string, value: string, onChange: OnChangeCallback, autoFocus: boolean
	) => {
		return (
			<TextInput
				style={styles.input}
				autoFocus={autoFocus}
				onChangeText={onChange}
				value={value}
				placeholder={placeholder}
				placeholderTextColor={placeholderColor}
				returnKeyType='search'
				blurOnSubmit={false}
				onSubmitEditing={control.findNext}
			/>
		);
	};

	// Close the search dialog on back button press
	useEffect(() => {
		// Only register the listener if the dialog is visible
		if (!state.dialogVisible) {
			return () => {};
		}

		const backListener = BackHandler.addEventListener('hardwareBackPress', () => {
			control.hideSearch();
			return true;
		});

		return () => backListener.remove();
	}, [state.dialogVisible]);



	const closeButton = (
		<ActionButton
			styles={styles}
			iconName="close"
			onPress={control.hideSearch}
			title={_('Close search')}
		/>
	);

	const showDetailsButton = (
		<ActionButton
			styles={styles}
			iconName="menu-down"
			onPress={() => setShowAdvanced(true)}
			title={_('Show advanced')}
		/>
	);

	const hideDetailsButton = (
		<ActionButton
			styles={styles}
			iconName="menu-up"
			onPress={() => setShowAdvanced(false)}
			title={_('Hide advanced')}
		/>
	);

	const searchTextInput = createInput(
		_('Search for...'),
		state.searchText,
		(newText: string) => {
			updateSearchState({
				searchText: newText,
			});
		},

		// Autofocus
		true
	);

	const replaceTextInput = createInput(
		_('Replace with...'),
		state.replaceText,
		(newText: string) => {
			updateSearchState({
				replaceText: newText,
			});
		},

		// Don't autofocus
		false
	);

	const labeledSearchInput = (
		<View style={styles.labeledInput} accessible>
			<Text style={styles.text}>{_('Find: ')}</Text>
			{ searchTextInput }
		</View>
	);

	const labeledReplaceInput = (
		<View style={styles.labeledInput} accessible>
			<Text style={styles.text}>{_('Replace: ')}</Text>
			{ replaceTextInput }
		</View>
	);

	const toNextButton = (
		<ActionButton
			styles={styles}
			iconName="menu-right"
			onPress={control.findNext}
			title={_('Next match')}
		/>
	);

	const toPrevButton = (
		<ActionButton
			styles={styles}
			iconName="menu-left"
			onPress={control.findPrevious}
			title={_('Previous match')}
		/>
	);

	const replaceButton = (
		<ActionButton
			styles={styles}
			iconName="swap-horizontal"
			onPress={control.replaceCurrent}
			title={_('Replace')}
		/>
	);

	const replaceAllButton = (
		<ActionButton
			styles={styles}
			iconName="reply-all"
			onPress={control.replaceAll}
			title={_('Replace all')}
		/>
	);

	const regexpButton = (
		<ToggleButton
			styles={styles}
			iconName="regex"
			onToggle={() => {
				updateSearchState({
					useRegex: !state.useRegex,
				});
			}}
			active={state.useRegex}
			title={_('Regular expression')}
		/>
	);

	const caseSensitiveButton = (
		<ToggleButton
			styles={styles}
			iconName="format-letter-case"
			onToggle={() => {
				updateSearchState({
					caseSensitive: !state.caseSensitive,
				});
			}}
			active={state.caseSensitive}
			title={_('Case sensitive')}
		/>
	);

	const simpleLayout = (
		<View style={{ flexDirection: 'row' }}>
			{ closeButton }
			{ searchTextInput }
			{ showDetailsButton }
			{ toPrevButton }
			{ toNextButton }
		</View>
	);

	const advancedLayout = (
		<View style={{ flexDirection: 'column', alignItems: 'center' }}>
			<View style={{ flexDirection: 'row' }}>
				{ closeButton }
				{ labeledSearchInput }
				{ hideDetailsButton }
				{ toPrevButton }
				{ toNextButton }
			</View>
			<View style={{ flexDirection: 'row' }}>
				{ regexpButton }
				{ caseSensitiveButton }
				{ labeledReplaceInput }
				{ replaceButton }
				{ replaceAllButton }
			</View>
		</View>
	);

	if (!state.dialogVisible) {
		return null;
	}

	return showingAdvanced ? advancedLayout : simpleLayout;
};

export default SearchPanel;
