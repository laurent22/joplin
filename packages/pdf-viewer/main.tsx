import React from 'react';
import shim from '@joplin/lib/shim';
shim.setReact(React);
import { render } from 'react-dom';
import * as pdfjsLib from 'pdfjs-dist';
import MiniViewerApp from './miniViewer';
import MessageService from './messageService';
import FullViewer from './FullViewer';

require('./common.css');

// Setting worker path to worker bundle.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';

const url = window.frameElement.getAttribute('x-url');
const type = window.frameElement.getAttribute('x-type');
const appearance = window.frameElement.getAttribute('x-appearance');
const anchorPage = window.frameElement.getAttribute('x-anchorPage');
const pdfId = window.frameElement.getAttribute('id');
const resourceId = window.frameElement.getAttribute('x-resourceid');
const title = window.frameElement.getAttribute('x-title');

document.documentElement.setAttribute('data-theme', appearance);

const messageService = new MessageService(type);

function App() {
	if (type === 'mini') {
		return <MiniViewerApp pdfPath={url}
			isDarkTheme={appearance === 'dark'}
			anchorPage={anchorPage ? Number(anchorPage) : null}
			pdfId={pdfId}
			resourceId={resourceId}
			messageService={messageService}/>;
	} else if (type === 'full') {
		return <FullViewer pdfPath={url}
			isDarkTheme={appearance === 'dark'}
			startPage={anchorPage ? Number(anchorPage) : 1}
			title={title}
			messageService={messageService} />;
	}
	return <div>Error: Unknown app type "{type}"</div>;
}

render(
	<App/>,
	document.getElementById('pdf-root')
);
