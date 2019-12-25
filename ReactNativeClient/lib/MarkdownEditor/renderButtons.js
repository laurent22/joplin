import React from 'react';
import { FlatList, TouchableOpacity, Text } from 'react-native';

import Formats from './Formats';

// TODO: Support custom themes
const FOREGROUND_COLOR = 'rgba(82, 194, 175, 1)';
const defaultStyles = { padding: 8, color: FOREGROUND_COLOR, fontSize: 16 };

const defaultMarkdownButton = ({ item, getState, setState }) => {
	return (
		<TouchableOpacity onPress={() => item.onPress({ getState, setState, item })}>
			<Text style={[defaultStyles, item.style]}>
				{item.title}
			</Text>
		</TouchableOpacity>
	);
};

export const renderFormatButtons = ({ getState, setState }, formats, markdownButton) => {
	const list = (
		<FlatList
			data={formats ? formats : Formats}
			keyboardShouldPersistTaps="always"
			// eslint-disable-next-line no-unused-vars
			renderItem={({ item, index }) =>
				markdownButton
					? markdownButton({ item, getState, setState })
					: defaultMarkdownButton({ item, getState, setState })}
			horizontal
		/>
	);
	return list;
};
