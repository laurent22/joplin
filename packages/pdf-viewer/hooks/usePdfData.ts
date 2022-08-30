import { useState } from 'react';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import { PdfData } from '../pdfSource';


const usePdfData = (pdfPath: string) => {
	const [pdf, setPdf] = useState<PdfData>(null);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const pdfData = new PdfData();
		await pdfData.loadDoc(pdfPath);
		if (event.cancelled) return;
		setPdf(pdfData);
	}, [pdfPath]);

	return pdf;
};

export default usePdfData;
