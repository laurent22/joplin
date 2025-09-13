import * as React from 'react';
import TextInput from './TextInput';
import { View, StyleSheet, TextInputProps, ViewStyle, TextInput as ReactNativeTextInput, Keyboard } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { Ref, useCallback, useMemo } from 'react';
import { themeStyle } from './global-style';
import IconButton from './IconButton';


interface SearchInputProps extends TextInputProps {
	inputRef?: Ref<ReactNativeTextInput>;
	value: string;
	onChangeText: (text: string)=> void;
	themeId: number;
	containerStyle: ViewStyle;
}

const useStyles = (themeId: number, hasContent: boolean) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			root: {
				flexDirection: 'row',
				justifyContent: 'center',
				alignItems: 'center',
			},
			inputStyle: {
				fontSize: theme.fontSize,
				flexGrow: 1,
				borderWidth: 0,
				borderBlockColor: 'transparent',
				paddingLeft: 0,
				paddingRight: 0,
				paddingTop: 0,
				paddingBottom: 0,
			},
			closeButton: hasContent ? {} : {
				opacity: 0,
			},
			icon: {
				color: theme.colorFaded,
				fontSize: theme.fontSizeLarger,
				width: 32,
				verticalAlign: 'middle',
				textAlign: 'center',
				alignContent: 'center',
			},
		});
	}, [themeId, hasContent]);
};

const SearchInput: React.FC<SearchInputProps> = ({ inputRef, themeId, value, containerStyle, style, onChangeText, ...rest }) => {
	const styles = useStyles(themeId, !!value);

	const onClear = useCallback(() => {
		onChangeText('');
	}, [onChangeText]);

	return <View style={[styles.root, containerStyle]}>
		<IconButton
			iconName='material magnify'
			onPress={() => Keyboard.dismiss()}
			description={_('Hide keyboard')}
			iconStyle={styles.icon}
			themeId={themeId}
		/>
		<TextInput
			ref={inputRef}
			style={[styles.inputStyle, style]}
			themeId={themeId}
			value={value}
			onChangeText={onChangeText}
			underlineColorAndroid='transparent'
			{...rest}
		/>
		<IconButton
			iconName='material close'
			onPress={onClear}
			description={_('Clear search')}
			disabled={value.length === 0}
			iconStyle={[styles.icon, styles.closeButton]}
			themeId={themeId}
		/>
	</View>;
};

export default SearchInput;
