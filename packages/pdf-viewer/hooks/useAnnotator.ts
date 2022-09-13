import { useEffect, useState } from 'react';
import PdfDocument from '../PdfDocument';
import Annotator from '../Annotator';


const useAnnotator = (pdfDocument: PdfDocument, onChange: ()=> void) => {
	const [annotator, setAnnotator] = useState<Annotator>(null);

	useEffect(() => {
		if (pdfDocument) {
			setAnnotator(new Annotator(pdfDocument, onChange));
		}
	}, [pdfDocument, onChange]);

	return annotator;
};

export default useAnnotator;
