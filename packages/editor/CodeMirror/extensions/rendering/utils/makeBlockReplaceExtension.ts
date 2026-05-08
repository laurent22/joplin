import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import { ReplacementExtension } from '../types';
import nodeIntersectsSelection from './nodeIntersectsSelection';

const updateDecorations = (state: EditorState, extensionSpec: ReplacementExtension) => {
	const doc = state.doc;
	const cursorLine = doc.lineAt(state.selection.main.anchor);

	const parentTagCounts = new Map<string, number>();
	const widgets: Range<Decoration>[] = [];
	syntaxTree(state).iterate({
		enter: node => {
			parentTagCounts.set(node.name, (parentTagCounts.get(node.name) ?? 0) + 1);

			const nodeLineFrom = doc.lineAt(node.from);
			const nodeLineTo = doc.lineAt(node.to);
			const selectionIsNearNode = Math.abs(nodeLineFrom.number - cursorLine.number) <= 1 || Math.abs(nodeLineTo.number - cursorLine.number) <= 1;
			const shouldHide = (
				(extensionSpec.hideWhenContainsSelection ?? true) && (
					nodeIntersectsSelection(state.selection, node) || selectionIsNearNode
				)
			);

			if (!shouldHide) {
				const widget = extensionSpec.createDecoration(node, state, parentTagCounts);
				if (widget) {
					let decoration;
					if (widget instanceof WidgetType) {
						decoration = Decoration.replace({
							widget,
							block: true,
						});
					} else {
						decoration = widget;
					}

					let rangeFrom = nodeLineFrom.from;
					let rangeTo = nodeLineTo.to;
					let skip = false;
					if (extensionSpec.getDecorationRange) {
						const range = extensionSpec.getDecorationRange(node, state);
						if (range) {
							rangeFrom = range[0];
							rangeTo = range.length === 1 ? range[0] : range[1];
						} else {
							skip = true;
						}
					}

					if (!skip) {
						widgets.push(decoration.range(rangeFrom, rangeTo));
					}
				}
			}
		},
		leave: node => {
			parentTagCounts.set(node.name, (parentTagCounts.get(node.name) ?? 0) - 1);
		},
	});

	return Decoration.set(widgets, true);
};

const makeBlockReplaceExtension = (extensionSpec: ReplacementExtension) => {
	const blockDecorationField = StateField.define<DecorationSet>({
		create(state) {
			return updateDecorations(state, extensionSpec);
		},
		update(decorations, transaction) {
			decorations = decorations.map(transaction.changes);
			const selectionChanged = !transaction.newSelection.eq(transaction.startState.selection);

			const wasRerenderRequested = () => {
				if (!extensionSpec.shouldFullReRender) return false;
				return extensionSpec.shouldFullReRender(transaction);
			};

			const treeChanged = syntaxTree(transaction.state) !== syntaxTree(transaction.startState);

			if (transaction.docChanged || selectionChanged || wasRerenderRequested() || treeChanged) {
				decorations = updateDecorations(transaction.state, extensionSpec);
			}

			return decorations;
		},
		provide: f => EditorView.decorations.from(f),
	});
	return [
		blockDecorationField,
	];
};

export default makeBlockReplaceExtension;

