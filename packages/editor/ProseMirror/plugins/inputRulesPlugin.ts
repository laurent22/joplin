import { buildInputRules } from 'prosemirror-example-setup';
import schema from '../schema';
import { MarkType, ResolvedPos } from 'prosemirror-model';
import { EditorState, Plugin, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { closeHistory } from 'prosemirror-history';


interface InlineInputRule {
	match: RegExp;
	matchEndCharacter: string;
	handler: (state: EditorState, match: RegExpMatchArray, start: number, end: number, commitCharacter: string)=> Transaction|null;
}

// A custom input rule extension for inline input replacements.
//
// Ref: https://github.com/ProseMirror/prosemirror-inputrules/blob/43ef04ce9c1512ef8f2289578309c40b431ed3c5/src/inputrules.ts#L82
// See https://discuss.prosemirror.net/t/trigger-inputrule-on-enter/1118 for why this approach is needed.
const inlineInputRules = (rules: InlineInputRule[], commitCharacterExpression: RegExp) => {
	const getContentBeforeCursor = (cursorInformation: ResolvedPos) => {
		const parent = cursorInformation.parent;
		const offsetInParent = cursorInformation.parentOffset;
		const maxLength = 256;
		return parent.textBetween(Math.max(offsetInParent - maxLength, 0), offsetInParent);
	};

	const getApplicableRule = (state: EditorState, cursor: number, justTypedText: string) => {
		if (!rules.some(rule => justTypedText.endsWith(rule.matchEndCharacter))) {
			return false;
		}
		const cursorInformation = state.doc.resolve(cursor);
		const inCode = cursorInformation.parent.type.spec.code;
		if (inCode) {
			return false;
		}
		const beforeCursor = getContentBeforeCursor(cursorInformation) + justTypedText;

		for (const rule of rules) {
			const match = beforeCursor.match(rule.match);
			if (!match) continue;

			return rule;
		}
		return null;
	};

	type PluginState = { pendingRule: InlineInputRule };
	const run = (view: EditorView, cursor: number, commitData: string) => {
		const commitCharacter = commitCharacterExpression.exec(commitData) ? commitData : '';

		// Commit on either a commit character or when the user presses "enter".
		if (!commitCharacter && commitData !== 'Enter') return false;

		const availableRule = plugin.getState(view.state)?.pendingRule;
		if (!availableRule) return false;

		const beforeCursor = getContentBeforeCursor(view.state.doc.resolve(cursor));
		const match = beforeCursor.match(availableRule.match);
		if (match) {
			const transaction = availableRule.handler(view.state, match, cursor - match[0].length, cursor, commitCharacter);
			if (transaction) {
				// closeHistory: Move the markup completion to a separate history event so that it
				// can be undone separately.
				view.dispatch(closeHistory(transaction));
				return true;
			}
		}

		return false;
	};

	const plugin = new Plugin<PluginState|null>({
		state: {
			init: () => null,
			apply: (tr, lastValue) => {
				const pendingRule = tr.getMeta(plugin);
				if (pendingRule) return pendingRule;
				if (tr.docChanged || tr.selectionSet) return null;
				return lastValue;
			},
		},
		props: {
			handleTextInput(view, _from, to, text, defaultAction) {
				const proposedRule = getApplicableRule(view.state, to, text);
				if (proposedRule) {
					const transaction = defaultAction().setMeta(plugin, { pendingRule: proposedRule });
					view.dispatch(transaction);
					return true;
				}
				return false;
			},
			handleDOMEvents: {
				compositionend: (view, event) => {
					if (view.state.selection.empty) {
						return run(view, view.state.selection.to, event.data);
					}
					return false;
				},
			},
			handleKeyDown: (view, event) => {
				return run(view, view.state.selection.to, event.key);
			},
		},
		// TODO: Uncomment this? Doing so allows the undoInputRule command to undo this input rule.
		//       However, it will require storing additional information in the plugin state (e.g. last transaction,
		//       start, end position) to be compatible with the upstream input rule extension.
		// isInputRules: true,
	});
	return plugin;
};

const makeMarkInputRule = (
	regExpString: string, matchEndCharacter: string, replacement: (matches: RegExpMatchArray)=> string, mark: MarkType,
): InlineInputRule => {
	const commitCharacterExp = '[.?!,:;¡¿() \\n]';
	const regex = new RegExp(`(^|${commitCharacterExp})${regExpString}$`);
	return {
		match: regex,
		matchEndCharacter,
		handler: (state, match, start, end, endCommitCharacter) => {
			let transaction = state.tr.delete(start, end);
			const marks = [schema.mark(mark)];

			const startCommitCharacter = match[1];

			// Remove the commit-character-related matches before forwarding the input
			// to the replacement function.
			const matchesWithoutCommitCharacters: RegExpMatchArray = [
				match[0].substring(startCommitCharacter.length, match[0].length),
				...match.slice(2, match.length),
			];
			matchesWithoutCommitCharacters.groups = match.groups;

			const replacementText = replacement(matchesWithoutCommitCharacters);

			transaction = transaction.insert(
				transaction.mapping.map(start, -1),
				[
					!!startCommitCharacter && schema.text(startCommitCharacter),
					!!replacementText && schema.text(replacementText, marks),
					!!endCommitCharacter && schema.text(endCommitCharacter),
				].filter(node => !!node),
			);

			return transaction;
		},
	};
};

const baseInputRules = buildInputRules(schema);
const inlineContentExp = '\\S[^\\n]*\\S|\\S';
const inputRulesExtension = [
	baseInputRules,
	inlineInputRules([
		makeMarkInputRule(
			`\\*\\*(${inlineContentExp})\\*\\*`,
			'*',
			(match) => match[1],
			schema.marks.strong,
		),
		makeMarkInputRule(
			`\\*(${inlineContentExp})\\*`,
			'*',
			(match) => match[1],
			schema.marks.emphasis,
		),
		makeMarkInputRule(
			`_(${inlineContentExp})_`,
			'_',
			(match) => match[1],
			schema.marks.emphasis,
		),
		makeMarkInputRule(
			`[\`](${inlineContentExp})[\`]`,
			'`',
			(match) => match[1],
			schema.marks.code,
		),
	], /[ .,?)!;]/),
];
export default inputRulesExtension;
