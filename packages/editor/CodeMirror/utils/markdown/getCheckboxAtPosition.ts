import { Tree } from '@lezer/common';

const isTaskListCheckbox = (node: Tree['topNode']) => {
	let parent = node.parent;
	while (parent) {
		if (parent.name === 'Task') return true;
		parent = parent.parent;
	}

	return false;
};

const getCheckboxAtPosition = (pos: number, tree: Tree) => {
	let iterator = tree.resolveStack(pos);

	while (true) {
		if (iterator.node.name === 'TaskMarker') {
			if (!isTaskListCheckbox(iterator.node.node)) {
				break;
			}
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
