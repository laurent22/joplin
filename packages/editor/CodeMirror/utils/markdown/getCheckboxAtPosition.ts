import { Tree } from '@lezer/common';

const getCheckboxAtPosition = (pos: number, tree: Tree) => {
	let iterator = tree.resolveStack(pos);

	while (true) {
		if (iterator.node.name === 'TaskMarker') {
			return iterator.node;
		}

		if (!iterator.next) {
			break;
		} else {
			iterator = iterator.next;
		}
	}

	return null;
};

export default getCheckboxAtPosition;
