/**
 * CSS to hide everything on the page,
 * except for elements that have the "beastify-image" class.
 */
const hidePage = `body > :not(.beastify-image) {
										display: none;
									}`;

/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
	document.addEventListener('click', async (event) => {
		const tabs = await browser.tabs.query({active: true, currentWindow: true});
		const html = await browser.tabs.sendMessage(tabs[0].id, {
			command: "getCompletePageHtml",
		});

		console.info('RRRRRRRRR', html);
	});

	// console.info('Listin');

	// document.addEventListener("click", (event) => {
	//   /**
	//    * Insert the page-hiding CSS into the active tab,
	//    * then get the beast URL and
	//    * send a "beastify" message to the content script in the active tab.
	//    */
	//   // function beastify(tabs) {
	//   //   browser.tabs.insertCSS({code: hidePage}).then(() => {
	//   //     let url = beastNameToURL(e.target.textContent);
	//   //     browser.tabs.sendMessage(tabs[0].id, {
	//   //       command: "beastify",
	//   //       beastURL: url
	//   //     });
	//   //   });
	//   // }

	//   // *
	//   //  * Remove the page-hiding CSS from the active tab,
	//   //  * send a "reset" message to the content script in the active tab.
		 
	//   // function reset(tabs) {
	//   //   browser.tabs.removeCSS({code: hidePage}).then(() => {
	//   //     browser.tabs.sendMessage(tabs[0].id, {
	//   //       command: "reset",
	//   //     });
	//   //   });
	//   // }

	//   /**
	//    * Just log the error to the console.
	//    */
	//   function reportError(error) {
	//     console.error(`Could not beastify: ${error}`);
	//   }

	//   // const action = event.currentTarget.getAttribute('data-action');

	//   console.info(event.currentTarget);



	//   /**
	//    * Get the active tab,
	//    * then call "beastify()" or "reset()" as appropriate.
	//    */
	//   // if (e.target.classList.contains("beast")) {
	//   //   browser.tabs.query({active: true, currentWindow: true})
	//   //     .then(beastify)
	//   //     .catch(reportError);
	//   // }
	//   // else if (e.target.classList.contains("reset")) {
	//   //   browser.tabs.query({active: true, currentWindow: true})
	//   //     .then(reset)
	//   //     .catch(reportError);
	//   // }
	// });
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
	document.querySelector("#popup-content").classList.add("hidden");
	document.querySelector("#error-content").classList.remove("hidden");
	console.error(`Failed to execute beastify content script: ${error.message}`);
}

browser.runtime.onMessage.addListener(notify);

function notify(message) {
	if (message.command === 'setCompletePageHtml') {

		console.info('UUUUUUUUUUUUU', message.baseUrl);

		fetch("http://127.0.0.1:9967/notes", {
			method: "POST",
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},

			//make sure to serialize your JSON body
			body: JSON.stringify({
				title: message.title,
				baseUrl: message.baseUrl,
				bodyHtml: message.html,
				url: message.url,
			})
		})
		.then( async (response) => { 
			console.info('GOT RESPNSE', response);
			const json = await response.json();
			console.info(json);
			 //do something awesome that makes the world a better place
		});
		// console.info('aaaaaaaaaa', message.html);
	}
	//console.info('Popup: got message', message);
	// browser.notifications.create({
	//   "type": "basic",
	//   "iconUrl": browser.extension.getURL("link.png"),
	//   "title": "You clicked a link!",
	//   "message": message.url
	// });
}


/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */

browser.tabs.executeScript({file: "/content_scripts/vendor.bundle.js"})
.then(() => {
	return browser.tabs.executeScript({file: "/content_scripts/index.js"})
})
.then(listenForClicks)
.catch(reportExecuteScriptError);

