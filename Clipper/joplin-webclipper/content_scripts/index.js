(function() {

	if (window.jopext_hasRun) return;
	window.jopext_hasRun = true;

	console.info('jopext: Loading content script');

	let browser_ = null;
	if (typeof browser !== 'undefined') {
		browser_ = browser;
		browserSupportsPromises_ = true;
	} else if (typeof chrome !== 'undefined') {
		browser_ = chrome;
		browserSupportsPromises_ = false;
	}

	function pageTitle() {
		const titleElements = document.getElementsByTagName("title");
		if (titleElements.length) return titleElements[0].text.trim();
		return document.title.trim();
	}

	function baseUrl() {
		let output = location.origin + location.pathname;
		if (output[output.length - 1] !== '/') {
			output = output.split('/');
			output.pop();
			output = output.join('/');
		}
		return output;
	}

	// Cleans up element by removing all its invisible children (which we don't want to render as Markdown)
	function cleanUpElement(element) {
		const childNodes = element.childNodes;

		for (let i = 0; i < childNodes.length; i++) {
			const node = childNodes[i];

			let isVisible = node.nodeType === 1 ? window.getComputedStyle(node).display !== 'none' : true;
			if (isVisible && ['input', 'textarea', 'script', 'noscript', 'style', 'select', 'option', 'button'].indexOf(node.nodeName.toLowerCase()) >= 0) isVisible = false;

			if (!isVisible) {
				element.removeChild(node);
			} else {
				cleanUpElement(node);
			}
		}
	}

	function readabilityProcess() {
		var uri = {
			spec: location.href,
			host: location.host,
			prePath: location.protocol + "//" + location.host,
			scheme: location.protocol.substr(0, location.protocol.indexOf(":")),
			pathBase: location.protocol + "//" + location.host + location.pathname.substr(0, location.pathname.lastIndexOf("/") + 1)
		};

		// Readability directly change the passed document so clone it so as
		// to preserve the original web page.
		const documentClone = document.cloneNode(true);
		const readability = new Readability(documentClone); // new window.Readability(uri, documentClone);
		const article = readability.parse();

		if (!article) throw new Error('Could not parse HTML document with Readability');

		return {
			title: article.title,
			body: article.content,
		}
	}

	async function prepareCommandResponse(command) {
		console.info('Got command: ' + command.name);

		const clippedContentResponse = (title, html) => {
			return {
				name: 'clippedContent',
				title: title,
				html: html,
				base_url: baseUrl(),
				url: location.origin + location.pathname + location.search,
				parent_id: command.parent_id,
				tags: command.tags || '',
			};			
		}

		if (command.name === "simplifiedPageHtml") {

			let article = null;
			try {
				article = readabilityProcess();
			} catch (error) {
				console.warn(error);
				console.warn('Sending full page HTML instead');
				const newCommand = Object.assign({}, command, { name: 'completePageHtml' });
				const response = await prepareCommandResponse(newCommand);
				response.warning = 'Could not retrieve simplified version of page - full page has been saved instead.';
				return response;
			}
			return clippedContentResponse(article.title, article.body);

		} else if (command.name === "completePageHtml") {

			const cleanDocument = document.body.cloneNode(true);
			cleanUpElement(cleanDocument);
			return clippedContentResponse(pageTitle(), cleanDocument.innerHTML);

		} else if (command.name === "selectedHtml") {

		    const range = window.getSelection().getRangeAt(0);
		    const container = document.createElement('div');
		    container.appendChild(range.cloneContents());
		    return clippedContentResponse(pageTitle(), container.innerHTML);

		} else if (command.name === 'screenshot') {

			const overlay = document.createElement('div');
			overlay.style.opacity = '0.6';
			overlay.style.background = 'black';
			overlay.style.width = '100%';
			overlay.style.height = '100%';
			overlay.style.zIndex = 99999999;
			overlay.style.top = 0;
			overlay.style.left = 0;
			overlay.style.position = 'fixed';

			document.body.appendChild(overlay);

			const messageComp = document.createElement('div');

			const messageCompWidth = 300;
			messageComp.style.position = 'fixed'
			messageComp.style.opacity = '0.95'
			messageComp.style.fontSize = '14px';
			messageComp.style.width = messageCompWidth + 'px'
			messageComp.style.maxWidth = messageCompWidth + 'px'
			messageComp.style.border = '1px solid black'
			messageComp.style.background = 'white'
			messageComp.style.top = '10px'
			messageComp.style.textAlign = 'center';
			messageComp.style.padding = '10px'
			messageComp.style.left = Math.round(document.body.clientWidth / 2 - messageCompWidth / 2) + 'px'
			messageComp.style.zIndex = overlay.style.zIndex + 1

			messageComp.textContent = 'Drag and release to capture a screenshot';

			document.body.appendChild(messageComp);

			const selection = document.createElement('div');
			selection.style.opacity = '0.4';
			selection.style.border = '1px solid red';
			selection.style.background = 'white';
			selection.style.border = '2px solid black';
			selection.style.zIndex = overlay.style.zIndex - 1;
			selection.style.top = 0;
			selection.style.left = 0;
			selection.style.position = 'fixed';

			document.body.appendChild(selection);

			let isDragging = false;
			let draggingStartPos = null;
			let selectionArea = {};

			function updateSelection() {
				selection.style.left = selectionArea.x + 'px';
				selection.style.top = selectionArea.y + 'px';
				selection.style.width = selectionArea.width + 'px';
				selection.style.height = selectionArea.height + 'px';
			}

			function setSelectionSizeFromMouse(event) {
				selectionArea.width = Math.max(1, event.clientX - draggingStartPos.x);
				selectionArea.height = Math.max(1, event.clientY - draggingStartPos.y);
				updateSelection();
			}

			function selection_mouseDown(event) {
				selectionArea = { x: event.clientX, y: event.clientY, width: 0, height: 0 }
				draggingStartPos = { x: event.clientX, y: event.clientY };
				isDragging = true;
				updateSelection();
			}

			function selection_mouseMove(event) {
				if (!isDragging) return;
				setSelectionSizeFromMouse(event);
			}

			function selection_mouseUp(event) {
				setSelectionSizeFromMouse(event);

				isDragging = false;

				overlay.removeEventListener('mousedown', selection_mouseDown);
				overlay.removeEventListener('mousemove', selection_mouseMove);
				overlay.removeEventListener('mouseup', selection_mouseUp);

				document.body.removeChild(overlay);
				document.body.removeChild(selection);
				document.body.removeChild(messageComp);

				console.info('jopext: selectionArea:', selectionArea);

				if (!selectionArea || !selectionArea.width || !selectionArea.height) return;

				// Need to wait a bit before taking the screenshot to make sure
				// the overlays have been removed and don't appear in the
				// screenshot. 10ms is not enough.
				setTimeout(() => {
					const content = {
						title: pageTitle(),
						crop_rect: selectionArea,
						url: location.origin + location.pathname,
						parent_id: command.parent_id,
						tags: command.tags,
					};

					browser_.runtime.sendMessage({
						name: 'screenshotArea',
						content: content,
						api_base_url: command.api_base_url,
					});
				}, 100);
			}

			overlay.addEventListener('mousedown', selection_mouseDown);
			overlay.addEventListener('mousemove', selection_mouseMove);
			overlay.addEventListener('mouseup', selection_mouseUp);

			return {};

		} else {
			throw new Error('Unknown command: ' + JSON.stringify(command));
		}
	}

	async function execCommand(command) {
		const response = await prepareCommandResponse(command);
		browser_.runtime.sendMessage(response);
	}

	browser_.runtime.onMessage.addListener((command) => {
		console.info('jopext: Got command:', command);

		execCommand(command);
	});

})();