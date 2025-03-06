import * as React from 'react';
import { Dialog, Divider, Surface, Text } from 'react-native-paper';
import { DialogType, PromptDialogData } from './types';
import { StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { themeStyle } from '../global-style';
import PromptButton from './PromptButton';

interface Props {
	dialog: PromptDialogData;
	themeId: number;
}

const useStyles = (themeId: number, isMenu: boolean) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		return StyleSheet.create({
			dialogContainer: {
				backgroundColor: theme.backgroundColor,
				borderRadius: theme.borderRadius,
				paddingTop: theme.borderRadius,
				marginLeft: 4,
				marginRight: 4,
			},

			dialogContent: {
				paddingBottom: 14,
			},
			dialogActions: {
				paddingBottom: 14,
				paddingTop: 4,

				...(isMenu ? {
					flexDirection: 'column',
					alignItems: 'stretch',
				} : {}),
			},
			dialogLabel: {
				textAlign: isMenu ? 'center' : undefined,
			},
		});
	}, [themeId, isMenu]);
};

const PromptDialog: React.FC<Props> = ({ dialog, themeId }) => {
	const isMenu = dialog.type === DialogType.Menu;
	const styles = useStyles(themeId, isMenu);

	const buttons = dialog.buttons.map((button, index) => {
		return <PromptButton
			key={`${index}-${button.text}`}
			buttonSpec={button}
			themeId={themeId}
		/>;
	});
	const titleComponent = <Text
		variant='titleMedium'
		accessibilityRole='header'
		style={styles.dialogLabel}
	>{dialog.title}</Text>;

	return (
		<Surface
			testID={'prompt-dialog'}
			style={styles.dialogContainer}
			key={dialog.key}
			elevation={1}
		>
			<Dialog.Content style={styles.dialogContent}>
				{dialog.title ? titleComponent : null}
				<Text
					variant='bodyMedium'
					style={styles.dialogLabel}
				>{dialog.message}</Text>
			</Dialog.Content>
			{isMenu ? <Divider/> : null}
			<Dialog.Actions
				style={styles.dialogActions}
			>
				{buttons}
			</Dialog.Actions>
		</Surface>
	);
};

export default PromptDialog;
