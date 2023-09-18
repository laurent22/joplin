import { EditorView, ViewPlugin, ViewUpdate, showPanel } from '@codemirror/view';
import { Extension, Text, Transaction } from '@codemirror/state';
import getScrollFraction from '../getScrollFraction';
import { CodeMirror as BaseCodeMirror5Emulation, Vim } from '@replit/codemirror-vim';
import { LogMessageCallback } from '../../types';
import editorCommands from '../editorCommands/editorCommands';
import { StateEffect } from '@codemirror/state';
import { StreamParser } from '@codemirror/language';
import Decorator, { LineWidgetOptions } from './Decorator';
const { pregQuote } = require('@joplin/lib/string-utils-common');


type CodeMirror5Command = (codeMirror: CodeMirror5Emulation)=> void;

type EditorEventCallback = (editor: CodeMirror5Emulation, ...args: any[])=> void;
type OptionUpdateCallback = (editor: CodeMirror5Emulation, newVal: any, oldVal: any)=> void;

interface CodeMirror5OptionRecord {
	onUpdate: OptionUpdateCallback;
	value: any;
}

interface DocumentPosition {
	line: number;
	ch: number;
}

const documentPositionFromPos = (doc: Text, pos: number): DocumentPosition => {
	const line = doc.lineAt(pos);
	return {
		// CM 5 uses 0-based line numbering
		line: line.number - 1,
		ch: pos - line.from,
	};
};

export default class CodeMirror5Emulation extends BaseCodeMirror5Emulation {
	private _events: Record<string, EditorEventCallback[]> = {};
	private _options: Record<string, CodeMirror5OptionRecord> = Object.create(null);
	private _decorator: Decorator;
	private _decoratorExtension: Extension;

	// Used by some plugins to store state.
	public state: Record<string, any> = Object.create(null);

	public Vim = Vim;

	// Passed as initial state to plugins
	public Init = { toString: () => 'CodeMirror.Init' };

	public constructor(
		public editor: EditorView,
		private logMessage: LogMessageCallback,
	) {
		super(editor);

		const { decorator, extension: decoratorExtension } = Decorator.create(editor);
		this._decorator = decorator;
		this._decoratorExtension = decoratorExtension;

		editor.dispatch({
			effects: StateEffect.appendConfig.of(this.makeCM6Extensions()),
		});
	}

	private makeCM6Extensions() {
		const cm5 = this;
		const editor = this.editor;

		return [
			// Fires events
			EditorView.domEventHandlers({
				scroll: () => CodeMirror5Emulation.signal(this, 'scroll'),
				focus: () => CodeMirror5Emulation.signal(this, 'focus'),
				blur: () => CodeMirror5Emulation.signal(this, 'blur'),
				mousedown: event => CodeMirror5Emulation.signal(this, 'mousedown', event),
			}),
			ViewPlugin.fromClass(class {
				public update(update: ViewUpdate) {
					try {
						if (update.viewportChanged) {
							CodeMirror5Emulation.signal(
								cm5,
								'viewportChange',
								editor.viewport.from,
								editor.viewport.to,
							);
						}

						if (update.docChanged) {
							cm5.fireChangeEvents(update);
							cm5.onChange(update);
						}

						if (update.selectionSet) {
							cm5.onSelectionChange();
						}

						CodeMirror5Emulation.signal(cm5, 'update');
					// Catch the error -- otherwise, CodeMirror will de-register the update listener.
					} catch (error) {
						cm5.logMessage(`Error dispatching update: ${error}`);
					}
				}
			}),

			// Decorations
			this._decoratorExtension,

			// Some plugins rely on a CodeMirror-measure element
			// to store temporary content.
			showPanel.of(() => {
				const dom = document.createElement('div');
				dom.classList.add('CodeMirror-measure');
				return { dom };
			}),

			// Note: We can allow legacy CM5 CSS to apply to the editor
			// with a line similar to the following:
			//    EditorView.editorAttributes.of({ class: 'CodeMirror' }),
			// Many of these styles, however, don't work well with CodeMirror 6.
		];
	}

	private isEventHandledBySuperclass(eventName: string) {
		return ['beforeSelectionChange'].includes(eventName);
	}

	public on(eventName: string, callback: EditorEventCallback) {
		if (this.isEventHandledBySuperclass(eventName)) {
			return super.on(eventName, callback);
		}
		this._events[eventName] ??= [];
		this._events[eventName].push(callback);
	}

	public off(eventName: string, callback: EditorEventCallback) {
		if (!(eventName in this._events)) {
			return;
		}

		this._events[eventName] = this._events[eventName].filter(
			otherCallback => otherCallback !== callback,
		);
	}

	public static signal(target: CodeMirror5Emulation, eventName: string, ...args: any[]) {
		const listeners = target._events[eventName] ?? [];

		for (const listener of listeners) {
			listener(target, ...args);
		}

		super.signal(target, eventName, ...args);
	}

	private fireChangeEvents(update: ViewUpdate) {
		type ChangeRecord = {
			from: DocumentPosition;
			to: DocumentPosition;
			text: string[];
			removed: string[];
			transaction: Transaction;
		};
		const changes: ChangeRecord[] = [];
		const origDoc = update.startState.doc;

		for (const transaction of update.transactions) {
			transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted: Text) => {
				changes.push({
					from: documentPositionFromPos(origDoc, fromA),
					to: documentPositionFromPos(origDoc, toA),
					text: inserted.sliceString(0).split('\n'),
					removed: origDoc.sliceString(fromA, toA).split('\n'),
					transaction,
				});
			});
		}

		// Delay firing events -- event listeners may try to create transactions.
		// (this is done by the rich markdown plugin).
		setTimeout(() => {
			for (const change of changes) {
				CodeMirror5Emulation.signal(this, 'change', change);

				// If triggered by a user, also send the inputRead event
				if (change.transaction.isUserEvent('input')) {
					CodeMirror5Emulation.signal(this, 'inputRead', change);
				}
			}

			CodeMirror5Emulation.signal(this, 'changes', changes);
		}, 0);

	}

	// codemirror-vim's adapter doesn't match the CM5 docs -- wrap it.
	public getCursor(mode?: 'head' | 'anchor' | 'from' | 'to'| 'start' | 'end') {
		if (mode === 'from') {
			mode = 'start';
		}
		if (mode === 'to') {
			mode = 'end';
		}

		return super.getCursor(mode);
	}

	public override getSearchCursor(query: RegExp|string, pos?: DocumentPosition|null|0) {
		// The superclass CodeMirror adapter only supports regular expression
		// arguments.
		if (typeof query === 'string') {
			query = new RegExp(pregQuote(query));
		}
		return super.getSearchCursor(query, pos || { line: 0, ch: 0 });
	}

	public lineAtHeight(height: number, _mode?: 'local') {
		const lineInfo = this.editor.lineBlockAtHeight(height);

		// - 1: Convert to zero-based.
		const lineNumber = this.editor.state.doc.lineAt(lineInfo.to).number - 1;
		return lineNumber;
	}

	public heightAtLine(lineNumber: number, mode?: 'local') {
		// CodeMirror 5 uses 0-based line numbers. CM6 uses 1-based
		// line numbers.
		const doc = this.editor.state.doc;
		const lineInfo = doc.line(Math.min(lineNumber + 1, doc.lines));
		const lineBlock = this.editor.lineBlockAt(lineInfo.from);

		const height = lineBlock.top;
		if (mode === 'local') {
			const editorTop = this.editor.lineBlockAt(0).top;
			return height - editorTop;
		} else {
			return height;
		}
	}

	public lineInfo(lineNumber: number) {
		const line = this.editor.state.doc.line(lineNumber + 1);

		const result = {
			line: lineNumber,

			// Note: In CM5, a line handle is not just a line number
			handle: lineNumber,

			text: line.text,
			gutterMarkers: [] as any[],
			textClass: ['cm-line', ...this._decorator.getLineClasses(lineNumber)],
			bgClass: '',
			wrapClass: '',
			widgets: this._decorator.getLineWidgets(lineNumber),
		};

		return result;
	}

	public getStateAfter(_line: number) {
		// TODO: Should return parser state. Returning an empty object
		//       allows some plugins to run without crashing, however.
		return {};
	}

	public getScrollPercent() {
		return getScrollFraction(this.editor);
	}

	public defineExtension(name: string, value: any) {
		(CodeMirror5Emulation.prototype as any)[name] ??= value;
	}

	public defineOption(name: string, defaultValue: any, onUpdate: OptionUpdateCallback) {
		this._options[name] = {
			value: defaultValue,
			onUpdate,
		};
		onUpdate(this, defaultValue, this.Init);
	}

	// Override codemirror-vim's setOption to allow user-defined options
	public override setOption(name: string, value: any) {
		if (name in this._options) {
			const oldValue = this._options[name].value;
			this._options[name].value = value;
			this._options[name].onUpdate(this, value, oldValue);
		} else {
			super.setOption(name, value);
		}
	}

	public override getOption(name: string): any {
		if (name in this._options) {
			return this._options[name].value;
		} else {
			return super.getOption(name);
		}
	}

	// codemirror-vim's API doesn't match the API docs here -- it expects addOverlay
	// to return a SearchQuery. As such, this override returns "any".
	public override addOverlay<State>(modeObject: StreamParser<State>|{ query: RegExp }): any {
		if ('query' in modeObject) {
			return super.addOverlay(modeObject);
		}

		this._decorator.addOverlay(modeObject);
	}

	public addLineClass(lineNumber: number, where: string, className: string) {
		this._decorator.addLineClass(lineNumber, where, className);
	}

	public removeLineClass(lineNumber: number, where: string, className: string) {
		this._decorator.removeLineClass(lineNumber, where, className);
	}

	public addLineWidget(lineNumber: number, node: HTMLElement, options: LineWidgetOptions) {
		this._decorator.addLineWidget(lineNumber, node, options);
	}

	// TODO: Currently copied from useCursorUtils.ts.
	// TODO: Remove the duplicate code when CodeMirror 5 is eventually removed.
	public wrapSelections(string1: string, string2: string) {
		const selectedStrings = this.getSelections();

		// Batches the insert operations, if this wasn't done the inserts
		// could potentially overwrite one another
		this.operation(() => {
			for (let i = 0; i < selectedStrings.length; i++) {
				const selected = selectedStrings[i];

				// Remove white space on either side of selection
				const start = selected.search(/[^\s]/);
				const end = selected.search(/[^\s](?=[\s]*$)/);
				const core = selected.substring(start, end - start + 1);

				// If selection can be toggled do that
				if (core.startsWith(string1) && core.endsWith(string2)) {
					const inside = core.substring(string1.length, core.length - string1.length - string2.length);
					selectedStrings[i] = selected.substring(0, start) + inside + selected.substring(end + 1);
				} else {
					selectedStrings[i] = selected.substring(0, start) + string1 + core + string2 + selected.substring(end + 1);
				}
			}
			this.replaceSelections(selectedStrings);
		});
	}

	public static commands = (() => {
		const commands: Record<string, CodeMirror5Command> = {
			...BaseCodeMirror5Emulation.commands,
		};

		for (const commandName in editorCommands) {
			const command = editorCommands[commandName as keyof typeof editorCommands];

			commands[commandName] = (codeMirror: CodeMirror5Emulation) => command(codeMirror.editor);
		}

		// as any: Required to properly extend the base class -- without this,
		// the commands dictionary isn't known (by TypeScript) to have the same
		// properties as the commands dictionary in the parent class.
		return commands as any;
	})();

	public commands = CodeMirror5Emulation.commands;

	private joplinCommandToCodeMirrorCommand(commandName: string): string|null {
		const match = /^editor\.(.*)$/g.exec(commandName);

		if (!match || !(match[1] in CodeMirror5Emulation.commands)) {
			return null;
		}

		return match[1] as string;
	}

	public supportsJoplinCommand(commandName: string): boolean {
		return this.joplinCommandToCodeMirrorCommand(commandName) in CodeMirror5Emulation.commands;
	}

	public execJoplinCommand(joplinCommandName: string) {
		const commandName = this.joplinCommandToCodeMirrorCommand(joplinCommandName);

		if (commandName === null) {
			this.logMessage(`Unsupported Joplin command, ${joplinCommandName}`);
			return;
		}

		this.execCommand(commandName);
	}

	public commandExists(commandName: string) {
		return commandName in CodeMirror5Emulation.commands;
	}

	public execCommand(name: string) {
		if (!this.commandExists(name)) {
			this.logMessage(`Unsupported CodeMirror command, ${name}`);
			return;
		}

		CodeMirror5Emulation.commands[name as (keyof typeof CodeMirror5Emulation.commands)](this);
	}
}

