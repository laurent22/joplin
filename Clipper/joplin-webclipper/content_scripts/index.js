(function() {

	if (window.jopext_hasRun) return;
	window.jopext_hasRun = true;

	console.info('jopext: Loading content script');

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
			const isVisible = node.nodeType === 1 ? window.getComputedStyle(node).display !== 'none' : true;
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
		const readability = new window.Readability(uri, documentClone);
		const article = readability.parse();

		if (!article) throw new Error('Could not parse HTML document with Readability');

		return {
			title: article.title,
			body: article.content,
		}
	}

	async function prepareCommandResponse(command) {
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

			return {
				name: 'clippedContent',
				html: article.body,
				title: article.title,
				baseUrl: baseUrl(),
				url: location.origin + location.pathname,
			};

		} else if (command.name === "completePageHtml") {

			const cleanDocument = document.body.cloneNode(true);
			cleanUpElement(cleanDocument);

			return {
				name: 'clippedContent',
				html: cleanDocument.innerHTML,
				title: pageTitle(),
				baseUrl: baseUrl(),
				url: location.origin + location.pathname,
			};

		} else if (command.name === "pageTitle") {
			
			return {
				name: 'pageTitle',
				text: pageTitle(),
			};

		} else {
			throw new Error('Unknown command', command);
		}
	}

	async function execCommand(command) {
		const response = await prepareCommandResponse(command);
		browser.runtime.sendMessage(response);
	}

	browser.runtime.onMessage.addListener((command) => {
		console.info('jopext: Got command:', command);

		execCommand(command);
	});

})();