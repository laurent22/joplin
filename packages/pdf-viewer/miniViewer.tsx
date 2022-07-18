import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
const pdfjsLib = require('pdfjs-dist');
import useIsFocused from './hooks/useIsFocused';
import { PdfData } from './pdfSource';
import VerticalPages from './VerticalPages';

require('./viewer.css');

// Setting worker path to worker bundle.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';


function MiniViewerApp(props: { pdfPath: string; isDarkTheme: boolean; anchorPage: number }) {
	const [pdf, setPdf] = useState<PdfData>(null);
	const isFocused = useIsFocused();
	const containerEl = useRef(null);

	useEffect(() => {
		const load = async () => {
			const pdfData = new PdfData();
			await pdfData.loadDoc(props.pdfPath);
			setPdf(pdfData);
		};
		load()
			.catch(console.error);
	}, []);

	if (!pdf) {
		return (
			<div className="mini-app loading">
				<div>Loading pdf..</div>
			</div>);
	}

	return (
		<div className={`mini-app${isFocused ? ' focused' : ''}`}>
			<div className={`app-pages${isFocused ? ' focused' : ''}`} ref={containerEl}>
				<VerticalPages pdf={pdf} isDarkTheme={props.isDarkTheme} anchorPage={props.anchorPage} container={containerEl} />
			</div>
			<div className='app-bottom-bar'>
				<div className='page-info'>
					{pdf.pageCount} pages
				</div>
				<div>{isFocused ? '' : 'Click to enable scroll'}</div>
			</div>
		</div>
	);
}

const url = window.frameElement.getAttribute('url');
const appearance = window.frameElement.getAttribute('appearance');
const anchorPage = window.frameElement.getAttribute('anchorPage');

document.documentElement.setAttribute('data-theme', appearance);

render(
	<MiniViewerApp pdfPath={url} isDarkTheme={appearance == 'dark'} anchorPage={anchorPage ? Number(anchorPage) : null} />,
	document.getElementById('pdf-root')
);
