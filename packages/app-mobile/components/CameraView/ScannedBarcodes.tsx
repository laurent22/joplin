import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BarcodeScanner } from './utils/useBarcodeScanner';
import { LinkButton, PrimaryButton } from '../buttons';
import { _ } from '@joplin/lib/locale';
import DismissibleDialog, { DialogSize } from '../DismissibleDialog';
import { Text } from 'react-native-paper';
import { isCallbackUrl, parseCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import CommandService from '@joplin/lib/services/CommandService';
import FadeOut from '../animation/FadeOut';

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

	const onShowDialog = useCallback(() => setDialogVisible(true), []);
	const onHideDialog = useCallback(() => setDialogVisible(false), []);

	const codeScanner = props.codeScanner;
	const scannedText = codeScanner.lastScan?.text;
	const isLink = useMemo(() => {
		return scannedText && isCallbackUrl(scannedText);
	}, [scannedText]);
	const onFollowLink = useCallback(() => {
		setDialogVisible(false);
		const data = parseCallbackUrl(scannedText);
		void CommandService.instance().execute('openItem', `:/${data.params.id}`);
	}, [scannedText]);
	const onInsertText = useCallback(() => {
		setDialogVisible(false);
		props.onInsertCode(scannedText);
	}, [scannedText, props.onInsertCode]);

	if (!scannedText) return null;
	return <View style={styles.container}>
		<FadeOut hideAfter={codeScanner.lastScan.timestamp + 5_000}>
			<PrimaryButton icon='qrcode' onPress={onShowDialog}>
				{_('QR Code')}
			</PrimaryButton>
		</FadeOut>
		<DismissibleDialog
			visible={dialogVisible}
			onDismiss={onHideDialog}
			themeId={props.themeId}
			size={DialogSize.Small}
		>
			<Text variant='titleMedium' role='heading'>{_('Scanned code')}</Text>
			<Text style={styles.scannedCode} variant='labelLarge' selectable={true}>{
				scannedText
			}</Text>
			<View style={styles.spacer}/>
			{isLink ? <LinkButton onPress={onFollowLink}>{_('Follow link')}</LinkButton> : null}
			<PrimaryButton onPress={onInsertText}>{_('Add to note')}</PrimaryButton>
		</DismissibleDialog>
	</View>;
};

export default ScannedBarcodes;
