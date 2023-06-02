import React = require('react');
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
const { themeStyle } = require('./global-style.js');
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../utils/types';

interface QuickItemProps {
	isTodo: boolean;
	onHide: ()=> void;
	onSubmit: (text: string)=> Promise<void>;
}

const QuickItem = (props: QuickItemProps) => {

	const [text, setText] = useState('');

	const themeId = useSelector((state: AppState) => state.settings.theme);
	const styles = useStyles(themeId);

	const listItemStyle = styles.listItem;
	const listItemTextStyle = styles.listItemText;
	const hideButtonStyle = styles.hideButtonStyle;

	return (
		<View style={listItemStyle}>
			{
				<TextInput
					style={listItemTextStyle}
					value={text}
					onChangeText={setText}
					onSubmitEditing={async (_event: any) => {
						await props.onSubmit(text);
						setText('');
					}}
					placeholder={'Untitled'}
					blurOnSubmit={false}
					label={props.isTodo ? 'New to-do' : 'New note'}
					autoFocus={true}
				/>
			}
			<TouchableOpacity
				onPress={props.onHide}
				style={hideButtonStyle}
			>
				<Text>Hide</Text>
			</TouchableOpacity>
		</View>
	);
};

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme: any = themeStyle(themeId);

		return StyleSheet.create({
			listItem: {
				flexDirection: 'row',
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				justifyContent: 'center',
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
			},
			listItemText: {
				flex: 1,
				color: theme.color,
				fontSize: theme.fontSize,
			},
			hideButtonStyle: {
				fontSize: theme.fontSize,
				paddingTop: theme.itemMarginTop + 15,
				paddingLeft: 10,
			},
		});
	}, [themeId]);
};

export default QuickItem;
