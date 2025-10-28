import * as React from 'react';
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { themeStyle } from './global-style';

import Modal, { ModalElementProps } from './Modal';
import { PrimaryButton } from './buttons';
import { _ } from '@joplin/lib/locale';
import { Button } from 'react-native-paper';

interface Props {
	themeId: number;
	children: React.ReactNode;
	modalProps: Partial<ModalElementProps>;

	buttonBarEnabled: boolean;
	okTitle: string;
	cancelTitle: string;
	onOkPress: ()=> void;
	onCancelPress: ()=> void;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			container: {
				borderRadius: 4,
				backgroundColor: theme.backgroundColor,
				maxWidth: 600,
				width: '100%',
				alignSelf: 'center',
				marginVertical: 'auto',
				flexShrink: 1,
				padding: theme.margin,
			},
			title: theme.headerStyle,
			contentWrapper: {
				flexGrow: 1,
			},
			buttonRow: {
				flexDirection: 'row',
				justifyContent: 'flex-end',
				gap: theme.margin,
				marginTop: theme.marginTop,
			},
			// Ensures that screen-reader-only headings have size (necessary for focusing/reading them).
			invisibleHeading: {
				flexGrow: 1,
			},
			// Use compact mode on the button and expand the padding to match the original styling, to work around an Android issue #13120
			buttonStyle: {
				paddingLeft: 16,
				paddingRight: 16,
			},
		});
	}, [themeId]);
};

const ModalDialog: React.FC<Props> = props => {
	const styles = useStyles(props.themeId);
	const theme = themeStyle(props.themeId);
	const containerStyle = !props.modalProps.containerStyle ? styles.container : {
		...styles.container,
		...props.modalProps.containerStyle,
	};
	const modalProps = {
		...props.modalProps,
		containerStyle,
	} as Partial<ModalElementProps>;

	return (
		<Modal
			transparent={true}
			visible={true}
			onRequestClose={null}
			backgroundColor={theme.backgroundColorTransparent2}
			{...modalProps}
		>
			<View style={styles.contentWrapper}>{props.children}</View>
			<View style={styles.buttonRow}>
				<View
					// This heading makes it easier for screen readers to jump to the
					// actions list. Without a heading here, it can be difficult to locate the "ok" and "cancel"
					// buttons.
					role='heading'
					aria-label={_('Actions')}
					accessible={true}
					style={styles.invisibleHeading}
				/>
				<Button compact contentStyle={styles.buttonStyle} disabled={!props.buttonBarEnabled} onPress={props.onCancelPress}>{props.cancelTitle}</Button>
				<PrimaryButton compact contentStyle={styles.buttonStyle} disabled={!props.buttonBarEnabled} onPress={props.onOkPress}>{props.okTitle}</PrimaryButton>
			</View>
		</Modal>
	);
};

export default ModalDialog;
