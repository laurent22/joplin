import { useMemo, useState } from 'react';


interface ScannedData {
	text: string;
	timestamp: number;
}

interface BarcodeScanningResult {
	type: string;
	data: string;
}

export interface BarcodeScanner {
	enabled: boolean;
	onToggleEnabled: ()=> void;
	onBarcodeScanned: (scan: BarcodeScanningResult)=> void;
	lastScan: ScannedData|null;
}


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
			lastScan,
		};
	}, [lastScan, enabled]);
};

export default useBarcodeScanner;
