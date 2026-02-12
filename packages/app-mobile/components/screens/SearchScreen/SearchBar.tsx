import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { StyleSheet, TextInput, View } from 'react-native';
import { themeStyle } from '../../global-style';
import IconButton from '../../IconButton';
import { useMemo } from 'react';

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
				flexDirection: 'row',
				alignItems: 'center',
				borderWidth: 1,
				borderColor: theme.dividerColor,
			},
			searchTextInput: {
				...theme.lineInput,
				paddingLeft: theme.marginLeft,
				flex: 1,
				backgroundColor: theme.backgroundColor,
				color: theme.color,
			},
			clearIcon: {
				...theme.icon,
				color: theme.colorFaded,
				paddingRight: theme.marginRight,
				backgroundColor: theme.backgroundColor,
			},
		});
	}, [themeId]);
};

const SearchBar: React.FC<Props> = ({ themeId, value, autoFocus, placeholder, onChangeText, onClearButtonPress, onSubmitEditing }) => {
	const theme = themeStyle(themeId);
	const styles = useStyles(themeId);

	return (
		<View style={styles.searchContainer}>
			<TextInput
				style={styles.searchTextInput}
				autoFocus={autoFocus}
				underlineColorAndroid="#ffffff00"
				onChangeText={onChangeText}
				onSubmitEditing={onSubmitEditing}
				placeholder={placeholder}
				placeholderTextColor={theme.colorFaded}
				value={value}
				selectionColor={theme.textSelectionColor}
				keyboardAppearance={theme.keyboardAppearance}
			/>
			<IconButton
				themeId={themeId}
				iconStyle={styles.clearIcon}
				iconName='ionicon close-circle'
				onPress={onClearButtonPress}
				description={_('Clear')}
			/>
		</View>
	);
};

export default SearchBar;
