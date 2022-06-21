import React from 'react';
import { render } from 'react-dom';

const url = window.location.href.split('?resPath=')[1];
console.log('pdf url:',url);

function App() {
	return (
		<div className="App">
        Joplin PDF Viewer
		</div>
	);
}


render(
	<App/>,
	document.getElementById('pdf-root')
);
