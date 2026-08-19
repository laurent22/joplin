import type { CameraDirection } from '@joplin/lib/models/settings/builtInMetadata';
import type { ViewStyle } from 'react-native';

export type OnInsertBarcode = (barcodeText: string)=> void;

export interface CameraResult {
	uri: string;
	type: string;
}

export interface CameraViewProps {
	themeId: number;
	style: ViewStyle;
	cameraType: CameraDirection;
	cameraRatio: string;
	onPhoto: (data: CameraResult)=> void;
	// If null, cancelling should be handled by the parent
	// component
	onCancel: (()=> void)|null;
	onInsertBarcode: OnInsertBarcode;
}
