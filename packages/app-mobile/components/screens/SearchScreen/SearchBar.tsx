import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { StyleSheet } from 'react-native';
import { themeStyle } from '../../global-style';
import { useMemo, useState } from 'react';
import { Searchbar } from 'react-native-paper';

interface Props {
	themeId: number;
	value: string;
	autoFocus: boolean;
	placeholder?: string;
	onChangeText: (text: string)=> void;
	onClearButtonPress: ()=> void;
	onSubmitEditing?: ()=> void;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			searchContainer: {
				borderWidth: 2,
				borderColor: theme.dividerColor,
				backgroundColor: theme.backgroundColor,
				margin: theme.margin,
				borderRadius: theme.borderRadius,
			},
			searchTextInput: {
				color: theme.color,
				fontSize: theme.fontSize,
			},
		});
	}, [themeId]);
};

const SearchBar: React.FC<Props> = ({ themeId, value, autoFocus, placeholder, onChangeText, onClearButtonPress, onSubmitEditing }) => {
	const [isFocused, setIsFocused] = useState(false);
	const theme = themeStyle(themeId);
	const styles = useStyles(themeId);

	return (
		<Searchbar
			style={[styles.searchContainer, isFocused && { borderColor: theme.color4 }]}
			inputStyle={styles.searchTextInput}
			autoFocus={autoFocus}
			autoCapitalize='none'
			autoComplete='off'
			autoCorrect={false}
			clearAccessibilityLabel={_('Clear')}
			clearIcon='close'
			iconColor={theme.colorFaded}
			onBlur={() => setIsFocused(false)}
			onChangeText={onChangeText}
			onClearIconPress={onClearButtonPress}
			onFocus={() => setIsFocused(true)}
			onSubmitEditing={onSubmitEditing}
			placeholder={placeholder ?? _('Search')}
			placeholderTextColor={theme.colorFaded}
			value={value}
			selectionColor={theme.textSelectionColor}
			keyboardAppearance={theme.keyboardAppearance}
		/>
	);
};

export default SearchBar;
