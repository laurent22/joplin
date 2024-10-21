import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { BarcodeScanner } from './utils/useBarcodeScanner';
import { LinkButton, PrimaryButton } from '../buttons';
import { _ } from '@joplin/lib/locale';
import DismissibleDialog, { DialogSize } from '../DismissibleDialog';
import { Chip, Text } from 'react-native-paper';
import { isCallbackUrl, parseCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import CommandService from '@joplin/lib/services/CommandService';

interface Props {
	themeId: number;
	codeScanner: BarcodeScanner;
	onInsertCode: (codeText: string)=> void;
}

const useStyles = () => {
	return useMemo(() => {
		return StyleSheet.create({
			container: {
				position: 'absolute',
				right: 10,
				top: 10,
			},
			spacer: {
				flexGrow: 1,
			},
			scannedCode: {
				padding: 20,
				fontFamily: Platform.select({
					android: 'monospace',
					ios: 'Courier New',
					default: undefined,
				}),
			},
		});
	}, []);
};

const ScannedBarcodes: React.FC<Props> = props => {
	const styles = useStyles();
	const [dialogVisible, setDialogVisible] = useState(false);

	const [dismissedAtTime, setDismissedAtTime] = useState(0);
	const onHideCodeNotification = useCallback(() => {
		setDismissedAtTime(performance.now());
	}, []);

	const onShowDialog = useCallback(() => {
		setDialogVisible(true);
	}, []);
	const onHideDialog = useCallback(() => {
		setDialogVisible(false);
		onHideCodeNotification();
	}, [onHideCodeNotification]);

	const codeScanner = props.codeScanner;
	const scannedText = codeScanner.lastScan?.text;

	const isLink = useMemo(() => {
		return scannedText && isCallbackUrl(scannedText);
	}, [scannedText]);
	const onFollowLink = useCallback(() => {
		setDialogVisible(false);
		const data = parseCallbackUrl(scannedText);
		if (data && data.params.id) {
			void CommandService.instance().execute('openItem', `:/${data.params.id}`);
		}
	}, [scannedText]);
	const onInsertText = useCallback(() => {
		setDialogVisible(false);
		props.onInsertCode(scannedText);
	}, [scannedText, props.onInsertCode]);

	const codeChipHidden = !scannedText || dialogVisible || codeScanner.lastScan.timestamp < dismissedAtTime;
	const dialogOpenButton = <Chip icon='qrcode' onPress={onShowDialog} onClose={onHideCodeNotification}>
		{_('QR Code')}
	</Chip>;
	return <View style={styles.container}>
		{codeChipHidden ? null : dialogOpenButton}
		<DismissibleDialog
			visible={dialogVisible}
			onDismiss={onHideDialog}
			themeId={props.themeId}
			size={DialogSize.Small}
		>
			<ScrollView>
				<Text variant='titleMedium' role='heading'>{_('Scanned code')}</Text>
				<Text
					style={styles.scannedCode}
					variant='labelLarge'
					selectable={true}
				>{scannedText}</Text>
			</ScrollView>
			<View style={styles.spacer}/>
			{isLink ? <LinkButton onPress={onFollowLink}>{_('Follow link')}</LinkButton> : null}
			<PrimaryButton onPress={onInsertText}>{_('Add to note')}</PrimaryButton>
		</DismissibleDialog>
	</View>;
};

export default ScannedBarcodes;
