(function() {

	if (window.jopext_hasRun) return;
	window.jopext_hasRun = true;

	console.info('jopext: Loading content script');

	let browser_ = null;
	if (typeof browser !== 'undefined') {
		// eslint-disable-next-line no-undef
		browser_ = browser;
		// eslint-disable-next-line no-undef
		browserSupportsPromises_ = true;
	} else if (typeof chrome !== 'undefined') {
		// eslint-disable-next-line no-undef
		browser_ = chrome;
		// eslint-disable-next-line no-undef
		browserSupportsPromises_ = false;
	}

	function absoluteUrl(url) {
		if (!url) return url;
		const protocol = url.toLowerCase().split(':')[0];
		if (['http', 'https', 'file', 'data'].indexOf(protocol) >= 0) return url;

		if (url.indexOf('//') === 0) {
			return location.protocol + url;
		} else if (url[0] === '/') {
			return `${location.protocol}//${location.host}${url}`;
		} else {
			return `${baseUrl()}/${url}`;
		}
	}

	function pageTitle() {
		const titleElements = document.getElementsByTagName('title');
		if (titleElements.length) return titleElements[0].text.trim();
		return document.title.trim();
	}

	function pageLocationOrigin() {
		// location.origin normally returns the protocol + domain + port (eg. https://example.com:8080)
		// but for file:// protocol this is browser dependant and in particular Firefox returns "null"
		// in this case.

		if (location.protocol === 'file:') {
			return 'file://';
		} else {
			return location.origin;
		}
	}

	function baseUrl() {
		let output = pageLocationOrigin() + location.pathname;
		if (output[output.length - 1] !== '/') {
			output = output.split('/');
			output.pop();
			output = output.join('/');
		}
		return output;
	}

	function getJoplinClipperSvgClassName(svg) {
		for (const className of svg.classList) {
			if (className.indexOf('joplin-clipper-svg-') === 0) return className;
		}
		return '';
	}

	function getImageSizes(element, forceAbsoluteUrls = false) {
		const output = {};

		const images = element.getElementsByTagName('img');
		for (let i = 0; i < images.length; i++) {
			const img = images[i];
			if (img.classList && img.classList.contains('joplin-clipper-hidden')) continue;

			let src = imageSrc(img);
			src = forceAbsoluteUrls ? absoluteUrl(src) : src;

			if (!output[src]) output[src] = [];

			output[src].push({
				width: img.width,
				height: img.height,
				naturalWidth: img.naturalWidth,
				naturalHeight: img.naturalHeight,
			});
		}

		const svgs = element.getElementsByTagName('svg');
		for (let i = 0; i < svgs.length; i++) {
			const svg = svgs[i];
			if (svg.classList && svg.classList.contains('joplin-clipper-hidden')) continue;

			const className = getJoplinClipperSvgClassName(svg);// 'joplin-clipper-svg-' + i;

			if (!className) {
				console.warn('SVG without a Joplin class:', svg);
				continue;
			}

			if (!svg.classList.contains(className)) {
				svg.classList.add(className);
			}

			const rect = svg.getBoundingClientRect();

			if (!output[className]) output[className] = [];

			output[className].push({
				width: rect.width,
				height: rect.height,
			});
		}

		return output;
	}

	function getAnchorNames(element) {
		const output = [];
		// Anchor names are normally in A tags but can be in SPAN too
		// https://github.com/laurent22/joplin-turndown/commit/45f4ee6bf15b8804bdc2aa1d7ecb2f8cb594b8e5#diff-172b8b2bc3ba160589d3a7eeb4913687R232
		for (const tagName of ['a', 'span']) {
			const anchors = element.getElementsByTagName(tagName);
			for (let i = 0; i < anchors.length; i++) {
				const anchor = anchors[i];
				if (anchor.id) {
					output.push(anchor.id);
				} else if (anchor.name) {
					output.push(anchor.name);
				}
			}
		}
		return output;
	}

	// In general we should use currentSrc because that's the image that's currently displayed,
	// especially within <picture> tags or with srcset. In these cases there can be multiple
	// sources and the best one is probably the one being displayed, thus currentSrc.
	function imageSrc(image) {
		if (image.currentSrc) return image.currentSrc;
		return image.src;
	}

	// Cleans up element by removing all its invisible children (which we don't want to render as Markdown)
	// And hard-code the image dimensions so that the information can be used by the clipper server to
	// display them at the right sizes in the notes.
	function cleanUpElement(convertToMarkup, element, imageSizes, imageIndexes) {
		const childNodes = element.childNodes;
		const hiddenNodes = [];

		for (let i = 0; i < childNodes.length; i++) {
			const node = childNodes[i];
			const nodeName = node.nodeName.toLowerCase();

			const isHidden = node && node.classList && node.classList.contains('joplin-clipper-hidden');

			if (isHidden) {
				hiddenNodes.push(node);
			} else {

				// If the data-joplin-clipper-value has been set earlier, create a new DIV element
				// to replace the input or text area, so that it can be exported.
				if (node.getAttribute && node.getAttribute('data-joplin-clipper-value')) {
					const div = document.createElement('div');
					div.innerText = node.getAttribute('data-joplin-clipper-value');
					node.parentNode.insertBefore(div, node.nextSibling);
					element.removeChild(node);
				}

				if (nodeName === 'img') {
					const src = absoluteUrl(imageSrc(node));
					node.setAttribute('src', src);
					if (!(src in imageIndexes)) imageIndexes[src] = 0;

					if (!imageSizes[src]) {
						// This seems to concern dynamic images that don't really such as Gravatar, etc.
						console.warn('Found an image for which the size had not been fetched:', src);
					} else {
						const imageSize = imageSizes[src][imageIndexes[src]];
						imageIndexes[src]++;
						if (imageSize && convertToMarkup === 'markdown') {
							node.width = imageSize.width;
							node.height = imageSize.height;
						}
					}
				}

				if (nodeName === 'svg') {
					const className = getJoplinClipperSvgClassName(node);
					if (!(className in imageIndexes)) imageIndexes[className] = 0;

					if (!imageSizes[className]) {
						// This seems to concern dynamic images that don't really such as Gravatar, etc.
						console.warn('Found an SVG for which the size had not been fetched:', className);
					} else {
						const imageSize = imageSizes[className][imageIndexes[className]];
						imageIndexes[className]++;
						if (imageSize) {
							node.style.width = `${imageSize.width}px`;
							node.style.height = `${imageSize.height}px`;
						}
					}
				}

				cleanUpElement(convertToMarkup, node, imageSizes, imageIndexes);
			}
		}

		for (const hiddenNode of hiddenNodes) {
			if (!hiddenNode.parentNode) continue;
			hiddenNode.parentNode.removeChild(hiddenNode);
		}
	}

	// When we clone the document before cleaning it, we lose some of the information that might have been set via CSS or
	// JavaScript, in particular whether an element was hidden or not. This function pre-process the document by
	// adding a "joplin-clipper-hidden" class to all currently hidden elements in the current document.
	// This class is then used in cleanUpElement() on the cloned document to find an element should be visible or not.
	function preProcessDocument(element) {
		const childNodes = element.childNodes;

		for (let i = childNodes.length - 1; i >= 0; i--) {
			const node = childNodes[i];
			const nodeName = node.nodeName.toLowerCase();
			const nodeParent = node.parentNode;
			const nodeParentName = nodeParent ? nodeParent.nodeName.toLowerCase() : '';
			const computedStyle = node.nodeType === 1 ? window.getComputedStyle(node) : {};

			let isVisible = node.nodeType === 1 ? computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' : true;
			if (isVisible && ['script', 'noscript', 'style', 'select', 'option', 'button'].indexOf(nodeName) >= 0) isVisible = false;

			// If it's a text input or a textarea and it has a value, save
			// that value to data-joplin-clipper-value. This is then used
			// when cleaning up the document to export the value.
			if (['input', 'textarea'].indexOf(nodeName) >= 0) {
				isVisible = !!node.value;
				if (nodeName === 'input' && node.getAttribute('type') !== 'text') isVisible = false;
				if (isVisible) node.setAttribute('data-joplin-clipper-value', node.value);
			}

			if (nodeName === 'script') {
				const a = node.getAttribute('type');
				if (a && a.toLowerCase().indexOf('math/tex') >= 0) isVisible = true;
			}

			if (nodeName === 'source' && nodeParentName === 'picture') {
				isVisible = false;
			}

			if (node.nodeType === 8) { // Comments are just removed since we can't add a class
				node.parentNode.removeChild(node);
			} else if (!isVisible) {
				node.classList.add('joplin-clipper-hidden');
			} else {
				preProcessDocument(node);
			}
		}
	}

	// This sets the PRE elements computed style to the style attribute, so that
	// the info can be exported and later processed by the htmlToMd converter
	// to detect code blocks.
	function hardcodePreStyles(doc) {
		const preElements = doc.getElementsByTagName('pre');

		for (const preElement of preElements) {
			const fontFamily = getComputedStyle(preElement).getPropertyValue('font-family');
			const fontFamilyArray = fontFamily.split(',').map(f => f.toLowerCase().trim());
			if (fontFamilyArray.indexOf('monospace') >= 0) {
				preElement.style.fontFamily = fontFamily;
			}
		}
	}

	function addSvgClass(doc) {
		const svgs = doc.getElementsByTagName('svg');
		let svgId = 0;

		for (const svg of svgs) {
			if (!getJoplinClipperSvgClassName(svg)) {
				svg.classList.add(`joplin-clipper-svg-${svgId}`);
				svgId++;
			}
		}
	}

	// Given a document, return a <style> tag that contains all the styles
	// required to render the page. Not currently used but could be as an
	// option to clip pages as HTML.
	function getStyleSheets(doc) {
		const output = [];
		for (let i = 0; i < doc.styleSheets.length; i++) {
			const sheet = doc.styleSheets[i];
			try {
				for (const cssRule of sheet.cssRules) {
					output.push({ type: 'text', value: cssRule.cssText });
				}
			} catch (error) {
				// Calling sheet.cssRules will throw a CORS error on Chrome if the stylesheet is on a different domain.
				// In that case, we skip it and add it to the list of stylesheet URLs. These URls will be downloaded
				// by the desktop application, since it doesn't have CORS restrictions.
				console.info('Could not retrieve stylesheet now:', sheet.href);
				console.info('It will downloaded by the main application.');
				console.info(error);
				output.push({ type: 'url', value: sheet.href });
			}
		}
		return output;
	}

	function documentForReadability() {
		// Readability directly change the passed document so clone it so as
		// to preserve the original web page.
		return document.cloneNode(true);
	}

	function readabilityProcess() {
		// eslint-disable-next-line no-undef
		const readability = new Readability(documentForReadability());
		const article = readability.parse();

		if (!article) throw new Error('Could not parse HTML document with Readability');

		return {
			title: article.title,
			body: article.content,
		};
	}

	async function prepareCommandResponse(command) {
		console.info(`Got command: ${command.name}`);
		const shouldSendToJoplin = !!command.shouldSendToJoplin;

		const convertToMarkup = command.preProcessFor ? command.preProcessFor : 'markdown';

		const clippedContentResponse = (title, html, imageSizes, anchorNames, stylesheets) => {
			return {
				name: shouldSendToJoplin ? 'sendContentToJoplin' : 'clippedContent',
				title: title,
				html: html,
				base_url: baseUrl(),
				url: pageLocationOrigin() + location.pathname + location.search,
				parent_id: command.parent_id,
				tags: command.tags || '',
				image_sizes: imageSizes,
				anchor_names: anchorNames,
				source_command: Object.assign({}, command),
				convert_to: convertToMarkup,
				stylesheets: stylesheets,
			};
		};

		if (command.name === 'simplifiedPageHtml') {

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
			return clippedContentResponse(article.title, article.body, getImageSizes(document), getAnchorNames(document));

		} else if (command.name === 'isProbablyReaderable') {

			// eslint-disable-next-line no-undef
			const ok = isProbablyReaderable(documentForReadability());
			return { name: 'isProbablyReaderable', value: ok };

		} else if (command.name === 'completePageHtml') {

			hardcodePreStyles(document);
			addSvgClass(document);
			preProcessDocument(document);
			// Because cleanUpElement is going to modify the DOM and remove elements we don't want to work
			// directly on the document, so we make a copy of it first.
			const cleanDocument = document.body.cloneNode(true);
			const imageSizes = getImageSizes(document, true);
			const imageIndexes = {};
			cleanUpElement(convertToMarkup, cleanDocument, imageSizes, imageIndexes);

			const stylesheets = convertToMarkup === 'html' ? getStyleSheets(document) : null;
			return clippedContentResponse(pageTitle(), cleanDocument.innerHTML, imageSizes, getAnchorNames(document), stylesheets);

		} else if (command.name === 'selectedHtml') {

			hardcodePreStyles(document);
			addSvgClass(document);
			preProcessDocument(document);

			const container = document.createElement('div');
			const rangeCount = window.getSelection().rangeCount;

			// Even when the user makes only one selection, Firefox might report multiple selections
			// so we need to process them all.
			// Fixes https://github.com/laurent22/joplin/issues/2294
			for (let i = 0; i < rangeCount; i++) {
				const range = window.getSelection().getRangeAt(i);
				container.appendChild(range.cloneContents());
			}

			const imageSizes = getImageSizes(document, true);
			const imageIndexes = {};
			cleanUpElement(convertToMarkup, container, imageSizes, imageIndexes);
			return clippedContentResponse(pageTitle(), container.innerHTML, getImageSizes(document), getAnchorNames(document));

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
			messageComp.style.position = 'fixed';
			messageComp.style.opacity = '0.95';
			messageComp.style.fontSize = '14px';
			messageComp.style.width = `${messageCompWidth}px`;
			messageComp.style.maxWidth = `${messageCompWidth}px`;
			messageComp.style.border = '1px solid black';
			messageComp.style.background = 'white';
			messageComp.style.color = 'black';
			messageComp.style.top = '10px';
			messageComp.style.textAlign = 'center';
			messageComp.style.padding = '10px';
			messageComp.style.left = `${Math.round(document.body.clientWidth / 2 - messageCompWidth / 2)}px`;
			messageComp.style.zIndex = overlay.style.zIndex + 1;

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

			const updateSelection = function() {
				selection.style.left = `${selectionArea.x}px`;
				selection.style.top = `${selectionArea.y}px`;
				selection.style.width = `${selectionArea.width}px`;
				selection.style.height = `${selectionArea.height}px`;
			};

			const setSelectionSizeFromMouse = function(event) {
				selectionArea.width = Math.max(1, event.clientX - draggingStartPos.x);
				selectionArea.height = Math.max(1, event.clientY - draggingStartPos.y);
				updateSelection();
			};

			const selection_mouseDown = function(event) {
				selectionArea = { x: event.clientX, y: event.clientY, width: 0, height: 0 };
				draggingStartPos = { x: event.clientX, y: event.clientY };
				isDragging = true;
				updateSelection();
			};

			const selection_mouseMove = function(event) {
				if (!isDragging) return;
				setSelectionSizeFromMouse(event);
			};

			const selection_mouseUp = function(event) {
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
						url: pageLocationOrigin() + location.pathname + location.search,
						parent_id: command.parent_id,
						tags: command.tags,
					};

					browser_.runtime.sendMessage({
						name: 'screenshotArea',
						content: content,
						api_base_url: command.api_base_url,
					});
				}, 100);
			};

			overlay.addEventListener('mousedown', selection_mouseDown);
			overlay.addEventListener('mousemove', selection_mouseMove);
			overlay.addEventListener('mouseup', selection_mouseUp);

			return {};

		} else if (command.name === 'pageUrl') {

			const url = pageLocationOrigin() + location.pathname + location.search;
			return clippedContentResponse(pageTitle(), url, getImageSizes(document), getAnchorNames(document));

		} else {
			throw new Error(`Unknown command: ${JSON.stringify(command)}`);
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
