import { useEffect, useState } from 'react';
import PdfDocument from '../PdfDocument';
import Annotator from '../Annotator';


const useAnnotator = (pdfDocument: PdfDocument) => {
	const [annotator, setAnnotator] = useState<Annotator>(null);

	useEffect(() => {
		if (pdfDocument) {
			setAnnotator(new Annotator(pdfDocument));
		}
	}, [pdfDocument]);

	return annotator;
};

export default useAnnotator;
