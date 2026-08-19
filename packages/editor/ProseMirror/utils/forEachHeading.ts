import uslug from '@joplin/fork-uslug/lib/uslug';
import { Node } from 'prosemirror-model';

type OnHeading = (node: Node, hash: string, pos: number)=> boolean|void;

const forEachHeading = (doc: Node, callback: OnHeading) => {
	let done = false;
	const seenHashes = new Set<string>();
	doc.descendants((node, pos) => {
		if (node.type.name === 'heading') {
			const originalHash = uslug(node.textContent);

			let hash = originalHash;
			let counter = 1;
			while (seenHashes.has(hash)) {
				counter++;
				hash = `${originalHash}-${counter}`;
			}
			seenHashes.add(hash);

			done = !!callback(node, hash, pos);
		}
		return !done;
	});
};

export default forEachHeading;
