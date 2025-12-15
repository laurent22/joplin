import * as React from 'react';
import { Dialog, Surface, Text } from 'react-native-paper';
import { TextInputDialogData } from './types';
import { StyleSheet, ViewStyle } from 'react-native';
import { useId, useMemo, useState } from 'react';
import PromptButton from './PromptButton';
import { _ } from '@joplin/lib/locale';
import TextInput from '../TextInput';

interface Props {
	dialog: TextInputDialogData;
	containerStyle: ViewStyle;
	themeId: number;
}

const useStyles = () => {
	return useMemo(() => {
		return StyleSheet.create({
			dialogContent: {
				paddingBottom: 14,
			},
			dialogActions: {
				paddingBottom: 14,
				paddingTop: 4,
			},
		});
	}, []);
};

const TextInputDialog: React.FC<Props> = ({ dialog, containerStyle, themeId }) => {
	const styles = useStyles();
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
					variant='bodyMedium'
					nativeID={labelId}
				>{dialog.message}</Text>
				<TextInput
					aria-labelledby={labelId}
					themeId={themeId}
					value={text}
					onChangeText={setText}
				/>
			</Dialog.Content>
			<Dialog.Actions
				style={styles.dialogActions}
			>
				<PromptButton
					buttonSpec={{
						text: _('Cancel'),
						onPress: dialog.onDismiss,
					}}
					themeId={themeId}
				/>
				<PromptButton
					buttonSpec={{
						text: _('OK'),
						onPress: () => dialog.onSubmit(text),
					}}
					themeId={themeId}
				/>
			</Dialog.Actions>
		</Surface>
	);
};

export default TextInputDialog;
