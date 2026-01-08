import { buildInputRules } from 'prosemirror-example-setup';
import schema from '../schema';
import { MarkType, ResolvedPos } from 'prosemirror-model';
import { EditorState, Plugin, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { closeHistory } from 'prosemirror-history';
import showCreateEditablePrompt from './joplinEditablePlugin/showCreateEditablePrompt';


interface InputRuleData {
	match: RegExp;
	commitCharacter: string|null;
	handler: (view: EditorView, match: RegExpMatchArray, start: number, end: number, commitCharacter: string)=> Transaction|null;
}

// A custom input rule extension for inline input replacements.
//
// Ref: https://github.com/ProseMirror/prosemirror-inputrules/blob/43ef04ce9c1512ef8f2289578309c40b431ed3c5/src/inputrules.ts#L82
// See https://discuss.prosemirror.net/t/trigger-inputrule-on-enter/1118 for why this approach is needed.
const inlineInputRules = (rules: InputRuleData[], commitCharacterExpression: RegExp) => {
	const getContentBeforeCursor = (cursorInformation: ResolvedPos) => {
		const parent = cursorInformation.parent;
		const offsetInParent = cursorInformation.parentOffset;
		const maxLength = 256;
		return parent.textBetween(Math.max(offsetInParent - maxLength, 0), offsetInParent);
	};

	const getApplicableRule = (state: EditorState, cursor: number, justTypedText: string) => {
		const candidateRules = rules.filter(rule => justTypedText.endsWith(rule.commitCharacter ?? ''));
		if (!candidateRules.length) {
			return false;
		}

		const cursorInformation = state.doc.resolve(cursor);
		const inCode = cursorInformation.parent.type.spec.code;
		if (inCode) {
			return false;
		}
		const beforeCursor = getContentBeforeCursor(cursorInformation) + justTypedText;

		for (const rule of candidateRules) {
			const match = beforeCursor.match(rule.match);
			if (!match) continue;

			return rule;
		}
		return null;
	};

	type PluginState = { pendingRule: InputRuleData };
	const run = (view: EditorView, cursor: number, commitData: string) => {
		const commitCharacter = commitCharacterExpression.exec(commitData) ? commitData : '';

		// Commit on either a commit character or when the user presses "enter".
		if (!commitCharacter && commitData !== 'Enter') return false;

		const availableRule = plugin.getState(view.state)?.pendingRule;
		if (!availableRule) return false;

		const beforeCursor = getContentBeforeCursor(view.state.doc.resolve(cursor));
		const match = beforeCursor.match(availableRule.match);
		if (match) {
			const transaction = availableRule.handler(view, match, cursor - match[0].length, cursor, commitCharacter);
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

type OnReplace = (matches: RegExpMatchArray, view: EditorView)=> string;
interface InputRuleOptions {
	contentRegex: string|RegExp;
	commitCharacter: string|null; // null => only "Enter"
	onReplace: OnReplace;
	marks: MarkType[];
}

const makeInputRule = ({
	contentRegex, commitCharacter, onReplace, marks,
}: InputRuleOptions): InputRuleData => {
	const commitCharacterExp = '[.?!,:;¡¿() \\n]';
	const regex = typeof contentRegex === 'string' ? new RegExp(`(^|${commitCharacterExp})${contentRegex}$`) : contentRegex;
	return {
		match: regex,
		commitCharacter,
		handler: (view, match, start, end, endCommitCharacter) => {
			const state = view.state;
			let transaction = state.tr.delete(start, end);

			const startCommitCharacter = match[1];

			// Remove the commit-character-related matches before forwarding the input
			// to the replacement function.
			const matchesWithoutCommitCharacters: RegExpMatchArray = [
				match[0].substring(startCommitCharacter.length, match[0].length),
				...match.slice(2, match.length),
			];
			matchesWithoutCommitCharacters.groups = match.groups;

			const replacement = onReplace(matchesWithoutCommitCharacters, view);
			transaction = transaction.insert(
				transaction.mapping.map(start, -1),
				[
					!!startCommitCharacter && schema.text(startCommitCharacter),
					!!replacement && schema.text(replacement, marks.map(type => schema.mark(type))),
					!!endCommitCharacter && schema.text(endCommitCharacter),
				].filter(node => !!node),
			);

			return transaction;
		},
	};
};

const baseInputRules = buildInputRules(schema);
const inlineContentExp = '\\S[^\\n]*\\S|\\S';
const noMatchRegex = /$^/;
const inputRulesExtension = [
	baseInputRules,
	inlineInputRules([
		makeInputRule({
			contentRegex: /(^|[\n])(```+)(\w*)$/,
			commitCharacter: '',
			onReplace: (match, view) => {
				const blockStart = `${match[1]}${match[2]}\n`;
				const block = `${blockStart}\n${match[1]}`;
				showCreateEditablePrompt({
					source: block,
					inline: false,
					cursor: blockStart.length,
				})(view.state, view.dispatch, view);
				return '';
			},
			marks: [],
		}),
	], noMatchRegex),
	inlineInputRules([
		makeInputRule({
			contentRegex: `\\*\\*(${inlineContentExp})\\*\\*`,
			commitCharacter: '*',
			onReplace: (match) => match[1],
			marks: [schema.marks.strong],
		}),
		makeInputRule({
			contentRegex: `\\*(${inlineContentExp})\\*`,
			commitCharacter: '*',
			onReplace: (match) => match[1],
			marks: [schema.marks.emphasis],
		}),
		makeInputRule({
			contentRegex: `_(${inlineContentExp})_`,
			commitCharacter: '_',
			onReplace: (match) => match[1],
			marks: [schema.marks.emphasis],
		}),
		makeInputRule({
			contentRegex: `\`(${inlineContentExp})\``,
			commitCharacter: '`',
			onReplace: (match) => match[1],
			marks: [schema.marks.code],
		}),
	], /[ .,?)!;]/),
];
export default inputRulesExtension;
