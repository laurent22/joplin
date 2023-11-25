'use strict';

const itemLinkToId = (link) => {
	// Examples of supported links:
	// - joplin://x-callback-url/openFolder?id=6c8caeec01a34c0f95487a04ebb79cb9
	// - joplin://x-callback-url/openNote?id=6c8caeec01a34c0f95487a04ebb79cb9
	// - :/6c8caeec01a34c0f95487a04ebb79cb9
	// - /home/user/.config/joplin-desktop/resources/6c8caeec01a34c0f95487a04ebb79cb9.svg
	// - [title](:/6c8caeec01a34c0f95487a04ebb79cb9)
	const linkRegexs = [
		// External item
		/^joplin:\/\/x-callback-url\/(?:openFolder|openNote)\?id=(\w+)$/,

		// Internal links
		/^\/:(\w+)$/,
		/^!?\[.*\]\(:\/(\w+)\)$/,

		// Resource file URLs
		/^(?:file:\/\/)?.*[/\\]resources[/\\](\w+)\.\w+$/,
	];

	for (const regex of linkRegexs) {
		const match = regex.exec(link);
		if (match) {
			return match[1];
		}
	}

	return link;
};

const setUpItemChecker = (parent, onSubmit) => {
	const button = document.createElement('button');
	button.innerText = 'Submit';

	const input = parent.querySelector('input');
	const outputContainer = document.createElement('div');
	outputContainer.classList.add('output', 'empty');

	const outputHeading = document.createElement('h3');
	const outputDetailsContainer = document.createElement('details');
	const outputDetailsContent = document.createElement('pre');

	outputHeading.setAttribute('aria-live', 'polite');

	outputDetailsContainer.appendChild(outputDetailsContent);
	outputContainer.replaceChildren(outputHeading, outputDetailsContainer);

	button.onclick = async () => {
		outputHeading.innerText = '⏳ Loading...';
		outputDetailsContent.innerText = '';
		outputContainer.classList.remove('error');
		outputContainer.classList.remove('empty');
		outputContainer.classList.add('loading');

		try {
			await onSubmit(itemLinkToId(input.value), outputHeading, outputDetailsContent);
			outputContainer.classList.remove('loading');
		} catch (error) {
			outputHeading.innerText = `⚠️ Error: ${error}`;
			outputContainer.classList.add('error');
		}
	};

	parent.appendChild(button);
	parent.appendChild(outputContainer);
};

const checkForItemOnServer = async (itemId, outputHeadingElement, outputDetailsElement) => {
	const fetchResult = await fetch(`/api/items/root:/${encodeURIComponent(itemId)}.md:/`);

	if (fetchResult.ok) {
		const result = await fetchResult.text();
		outputHeadingElement.innerText = 'Item found!';
		outputDetailsElement.innerText = result;
	} else {
		outputHeadingElement.innerText = `Item ${itemId}: ${fetchResult.statusText}`;
		outputDetailsElement.innerText = '';
	}
};

const checkForItemInInitialDiff = async (itemId, outputHeadingElement, outputDetailsElement) => {
	let cursor = undefined;

	const waitForTimeout = (timeout) => {
		return new Promise(resolve => {
			setTimeout(() => resolve(), timeout);
		});
	};

	const readDiff = async function*() {
		let hasMore = true;
		let page = 1;
		while (hasMore) {
			const fetchResult = await fetch(
				`/api/items/root/delta${
					cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
				}`,
			);
			if (!fetchResult.ok) {
				throw new Error(`Error fetching items: ${fetchResult.statusText}`);
			}

			const json = await fetchResult.json();
			hasMore = json.has_more;
			cursor = json.cursor;

			for (const item of json.items) {
				yield item;
			}

			outputHeadingElement.innerText = `Processing page ${page++}...`;

			// Avoid sending requests too frequently
			await waitForTimeout(200); // ms
		}
	};

	const allItems = [];
	const matches = [];
	let stoppedEarly = false;
	for await (const item of readDiff()) {
		// We also include console logging to provide more information if
		// readDiff() fails.
		// eslint-disable-next-line no-console
		console.log('Checking item', item);

		if (item.item_name === `${itemId}.md`) {
			matches.push(item);
			stoppedEarly = true;
		}
		allItems.push(item);
	}

	outputHeadingElement.innerText
		= matches.length > 0 ? 'Found in diff' : `Item ${itemId}: Not in diff`;

	const stoppedEarlyDescription = (
		stoppedEarly ? '\n Stopped fetching items after finding a match. Item list is incomplete.' : ''
	);
	outputDetailsElement.innerText
		= JSON.stringify(allItems, undefined, '  ') + stoppedEarlyDescription;
};

document.addEventListener('DOMContentLoaded', () => {
	setUpItemChecker(document.querySelector('#note-on-server-check'), checkForItemOnServer);
	setUpItemChecker(document.querySelector('#note-in-diff-check'), checkForItemInInitialDiff);
});
