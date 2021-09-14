import React from 'react';
import { FlatList, TouchableOpacity, Text } from 'react-native';

import Formats from './Formats';

const defaultStyles = { padding: 8, fontSize: 16 };

const defaultMarkdownButton = ({ item, getState, setState, color }) => {
	return (
		<TouchableOpacity onPress={() => item.onPress({ getState, setState, item })}>
			<Text style={[defaultStyles, item.style, { color: color }]}>
				{item.title}
			</Text>
		</TouchableOpacity>
	);
};

// eslint-disable-next-line import/prefer-default-export
export const renderFormatButtons = ({ getState, setState, color }, formats, markdownButton) => {
	const list = (
		<FlatList
			data={formats ? formats : Formats}
			keyboardShouldPersistTaps="always"
			// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
			renderItem={({ item, index }) =>
				markdownButton
					? markdownButton({ item, getState, setState })
					: defaultMarkdownButton({ item, getState, setState, color })}
			horizontal
		/>
	);
	return list;
};
