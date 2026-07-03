import * as React from 'react';
import { Dialog, Surface, Text } from 'react-native-paper';
import { TextInputDialogData } from './types';
import { StyleSheet, ViewStyle } from 'react-native';
import { useId, useMemo, useState } from 'react';
import PromptButton from './PromptButton';
import { _ } from '@joplin/lib/locale';
import TextInput from '../TextInput';
import { themeStyle } from '../global-style';

interface Props {
	dialog: TextInputDialogData;
	containerStyle: ViewStyle;
	themeId: number;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			dialogContent: {
				paddingBottom: theme.margin,
				paddingHorizontal: theme.margin,
			},
			dialogActions: {
				paddingBottom: theme.margin,
				paddingTop: 4,
				paddingHorizontal: theme.margin,
				gap: theme.marginMedium,
			},
			textInput: {
				borderBottomColor: theme.dividerColor,
				borderBottomWidth: 1,
				paddingLeft: 6,
				paddingBottom: 8,
			},
		});
	}, [themeId]);
};

const TextInputDialog: React.FC<Props> = ({ dialog, containerStyle, themeId }) => {
	const styles = useStyles(themeId);
	const [text, setText] = useState(dialog.initialValue ?? '');
	const labelId = useId();

	return (
		<Surface
			testID={'prompt-dialog'}
			style={containerStyle}
			key={dialog.key}
			elevation={1}
		>
			<Dialog.Content style={styles.dialogContent}>
				<Text
					variant='titleMedium'
					nativeID={labelId}
				>{dialog.message}</Text>
				<TextInput
					aria-labelledby={labelId}
					themeId={themeId}
					style={styles.textInput}
					value={text}
					onChangeText={setText}
					// Underline styles are set via styles
					underlineColorAndroid='transparent'
				/>
			</Dialog.Content>
			<Dialog.Actions
				style={styles.dialogActions}
			>
				<PromptButton
					buttonSpec={{
						text: _('Cancel'),
						style: 'cancel',
						onPress: dialog.onDismiss,
					}}
					isMenu={false}
					themeId={themeId}
				/>
				<PromptButton
					buttonSpec={{
						text: _('OK'),
						onPress: () => dialog.onSubmit(text),
					}}
					isMenu={false}
					themeId={themeId}
				/>
			</Dialog.Actions>
		</Surface>
	);
};

export default TextInputDialog;
