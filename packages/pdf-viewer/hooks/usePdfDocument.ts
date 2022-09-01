import { useState } from 'react';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import PdfDocument from '../PdfDocument';


const usePdfDocument = (pdfPath: string) => {
	const [pdfDocument, setPdfDocument] = useState<PdfDocument>(null);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const pdfData = new PdfDocument(document);
		await pdfData.loadDoc(pdfPath);
		if (event.cancelled) return;
		setPdfDocument(pdfData);
	}, [pdfPath]);

	return pdfDocument;
};

export default usePdfDocument;
