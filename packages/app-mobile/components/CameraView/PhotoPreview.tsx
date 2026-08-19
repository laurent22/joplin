import * as React from 'react';
import { ViewStyle, TextStyle, Platform, ImageBackground, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { CameraResult } from './types';
import shim from '@joplin/lib/shim';
import { _ } from '@joplin/lib/locale';

interface PhotoProps {
	source: CameraResult;
	backgroundStyle: ViewStyle;
	textStyle: TextStyle;
	label: number;
}

const styles = StyleSheet.create({
	background: {
		maxWidth: 70,
		flexShrink: 1,
		flexGrow: 1,
		alignContent: 'center',
		justifyContent: 'center',
	},
	text: {
		marginLeft: 'auto',
		marginRight: 'auto',
		marginTop: 'auto',
		padding: 4,
		borderRadius: 32,
		color: 'white',
		backgroundColor: '#11c',
	},
});

const PhotoPreview: React.FC<PhotoProps> = ({ source, label, backgroundStyle, textStyle }) => {
	const [uri, setUri] = useState('');

	useAsyncEffect(async (event) => {
		if (!source) {
			setUri('');
		} else if (Platform.OS === 'web') {
			const file = await shim.fsDriver().fileAtPath(source.uri);
			if (event.cancelled) return;

			const uri = URL.createObjectURL(file);
			setUri(uri);

			event.onCleanup(() => {
				URL.revokeObjectURL(uri);
			});
		} else {
			setUri(source.uri);
		}
	}, [source]);

	return <ImageBackground
		style={[styles.background, backgroundStyle]}
		resizeMode='contain'
		source={{ uri }}
		accessibilityLabel={_('%d photo(s) taken', label)}
	>
		<Text
			style={[styles.text, textStyle]}
			testID='photo-count'
		>{label}</Text>
	</ImageBackground>;
};

export default PhotoPreview;
