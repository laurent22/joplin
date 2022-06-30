/**
 * Displays a find/replace dialog
 */

const React = require('react');
const { StyleSheet } = require('react-native');
const { TextInput, View, Text, TouchableOpacity } = require('react-native');
const { useMemo, useState, useEffect } = require('react');
const MaterialCommunityIcon = require('react-native-vector-icons/MaterialCommunityIcons').default;

import { SearchControl, SearchState, EditorSettings } from './types';
import { _ } from '@joplin/lib/locale';
import { BackHandler } from 'react-native';

const BUTTON_SIZE = 48;

export const DEFAULT_SEARCH_STATE: SearchState = {
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

const ActionButton = (
	props: { styles: any; iconName: string; title: string; onPress: (()=> void) }
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

const ToggleButton = (
	props: { styles: any; iconName: string; title: string; active: boolean; onToggle: (()=> void) }
) => {
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


const getStyles = (theme: any): StyleSheet => {
	const buttonStyle = {
		width: BUTTON_SIZE,
		height: BUTTON_SIZE,
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
			backgroundColor: theme.backgroundColor2,
			color: theme.color2,
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
};

export const SearchPanel = (props: SearchPanelProps) => {
	const placeholderColor = props.editorSettings.themeData.color3;
	const styles = useMemo(() => {
		return getStyles(props.editorSettings.themeData);
	}, [props.editorSettings.themeData]);

	const [showingAdvanced, setShowAdvanced] = useState(false);

	const state = props.searchState;
	const control = props.searchControl;

	const updateSearchState = (changedData: any) => {
		const newState = Object.assign({}, state, changedData);
		control.setSearchState(newState);
	};

	// Creates a TextInut with the given parameters
	const createInput = (
		{ placeholder, value, onChange, autoFocus = false }:
			{ placeholder: string; value: string; onChange: (text: string)=> void; autoFocus?: boolean }
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

	const searchTextInput = createInput({
		placeholder: _('Search for...'),
		value: state.searchText,
		onChange: (newText: string) => {
			updateSearchState({
				searchText: newText,
			});
		},
		autoFocus: true,
	});

	const replaceTextInput = createInput({
		placeholder: _('Replace with...'),
		onChange: (newText: string) => {
			updateSearchState({
				replaceText: newText,
			});
		},
		value: state.replaceText,
	});

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
