
export type OnInsertBarcode = (barcodeText: string)=> void;

export interface CameraResult {
	uri: string;
	type: string;
}
