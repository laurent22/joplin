import { BarcodeScanningResult, BarcodeSettings } from 'expo-camera';
import { useMemo, useState } from 'react';


interface ScannedData {
	text: string;
	timestamp: number;
}

export interface BarcodeScanner {
	enabled: boolean;
	onToggleEnabled: ()=> void;
	onBarcodeScanned: (scan: BarcodeScanningResult)=> void;
	scannerSettings: BarcodeSettings|null;
	lastScan: ScannedData|null;
}


const barcodeScannerSettings: BarcodeSettings = {
	// Rocketbook pages use both QR and datamatrix
	barcodeTypes: ['qr', 'datamatrix'],
};

const useBarcodeScanner = (): BarcodeScanner => {
	const [lastScan, setLastScan] = useState<ScannedData|null>(null);
	const [enabled, setEnabled] = useState(true);
	return useMemo(() => {
		return {
			enabled,
			onToggleEnabled: () => {
				setEnabled(enabled => !enabled);
			},
			onBarcodeScanned: enabled ? (scanningResult: BarcodeScanningResult) => {
				setLastScan({
					text: scanningResult.data ?? 'null',
					timestamp: performance.now(),
				});
			} : null,
			scannerSettings: barcodeScannerSettings,
			lastScan,
		};
	}, [lastScan, enabled]);
};

export default useBarcodeScanner;
