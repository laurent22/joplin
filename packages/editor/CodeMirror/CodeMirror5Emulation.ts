import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, showPanel } from '@codemirror/view';
import { Range, RangeSetBuilder } from '@codemirror/state';
import getScrollFraction from './getScrollFraction';
import { CodeMirror as BaseCodeMirror5Emulation } from '@replit/codemirror-vim';
import { LogMessageCallback } from '../types';
import editorCommands from './editorCommands/editorCommands';
import { StateEffect } from '@codemirror/state';
import { StreamParser, StringStream, indentUnit } from '@codemirror/language';
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

export default class CodeMirror5Emulation extends BaseCodeMirror5Emulation {
	private _events: Record<string, EditorEventCallback[]> = {};
	private _options: Record<string, CodeMirror5OptionRecord> = Object.create(null);
	private _overlays: (StreamParser<any>)[] = [];

	// Used by some plugins to store state.
	public state: Record<string, any> = Object.create(null);

	public constructor(
		public editor: EditorView,
		private logMessage: LogMessageCallback,
	) {
		super(editor);

		editor.dispatch({
			effects: StateEffect.appendConfig.of(this.makeCM6Extensions()),
		});
		this.getWrapperElement().classList.add('CodeMirror');
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
				mousedown: event => CodeMirror5Emulation.signal(this, 'mousedown', this, event),
			}),
			ViewPlugin.fromClass(class {
				public update(update: ViewUpdate) {
					if (update.viewportChanged) {
						CodeMirror5Emulation.signal(
							cm5,
							'viewportChange',
							editor.viewport.from,
							editor.viewport.to,
						);
					}

					if (update.docChanged) {
						cm5.onChange(update);
					}

					if (update.selectionSet) {
						cm5.onSelectionChange();
					}
				}
			}),

			// Decorations
			ViewPlugin.fromClass(class {
				public decorations: DecorationSet;

				public constructor(view: EditorView) {
					this.decorations = cm5.createDecorations(view);
				}

				public update(update: ViewUpdate) {
					if (update.viewportChanged || update.docChanged) {
						this.decorations = cm5.createDecorations(update.view);
					}
				}
			}, {
				decorations: v => v.decorations,
			}),

			// Some plugins rely on a CodeMirror-measure element
			// to store temporary content.
			showPanel.of(() => {
				const dom = document.createElement('div');
				dom.classList.add('CodeMirror-measure');
				return { dom };
			}),
		];
	}

	private _decorationCache: Record<string, Decoration> = Object.create(null);

	private createDecorations(view: EditorView): DecorationSet {
		const makeDecoration = (
			tokenName: string, start: number, stop: number,
		) => {
			const isLineDecoration = tokenName.startsWith('line-');

			// CM5 prefixes class names with cm-
			tokenName = `cm-${tokenName}`;

			let decoration;
			if (tokenName in this._decorationCache) {
				decoration = this._decorationCache[tokenName];
			} else {
				const attributes = { class: tokenName };

				if (isLineDecoration) {
					decoration = Decoration.line({ attributes });
				} else {
					decoration = Decoration.mark({ attributes });
				}

				this._decorationCache[tokenName] = decoration;
			}

			return decoration.range(start, stop);
		};

		const indentSize = view.state.facet(indentUnit).length;
		const newDecorations: Range<Decoration>[] = [];

		for (const overlay of this._overlays) {
			const state = overlay.startState?.(indentSize) ?? {};

			for (const { from, to } of view.visibleRanges) {
				const fromLine = view.state.doc.lineAt(from);
				const toLine = view.state.doc.lineAt(to);

				const fromLineNumber = fromLine.number;
				const toLineNumber = toLine.number;

				for (let i = fromLineNumber; i <= toLineNumber; i++) {
					const line = view.state.doc.line(i);

					const reader = new StringStream(
						line.text,
						view.state.tabSize,
						indentSize,
					);
					let lastPos = 0;

					(reader as any).baseToken ??= (): null => null;

					while (!reader.eol()) {
						const token = overlay.token(reader, state);

						if (token) {
							for (const className of token.split(/\s+/)) {
								if (className.startsWith('line-')) {
									newDecorations.push(makeDecoration(className, line.from, line.from));
								} else {
									const from = lastPos + line.from;
									const to = reader.pos + line.from;
									newDecorations.push(makeDecoration(className, from, to));
								}
							}
						}

						if (reader.pos === lastPos) {
							this.logMessage('Warning: Mark decoration position did not increase. Exiting early.');
							break;
						}

						lastPos = reader.pos;
					}
				}
			}
		}

		// Required by CodeMirror:
		// Should be sorted by from position, then by length.
		newDecorations.sort((a, b) => {
			if (a.from !== b.from) {
				return a.from - b.from;
			}

			return a.to - b.to;
		});

		// Per the documentation, new tokens should be added in
		// increasing order.
		const decorations = new RangeSetBuilder<Decoration>();

		for (const decoration of newDecorations) {
			decorations.add(decoration.from, decoration.to, decoration.value);
		}

		return decorations.finish();
	}

	private isEventHandledBySubclass(eventName: string) {
		return ['mousedown', 'scroll', 'focus', 'blur', 'viewportChange'].includes(eventName);
	}

	public on(eventName: string, callback: EditorEventCallback) {
		if (!this.isEventHandledBySubclass(eventName)) {
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

	public override getSearchCursor(query: RegExp|string, pos: DocumentPosition|null|0) {
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

		return {
			line: lineNumber,

			// TODO: In CM5, a line handle is not a line number
			handle: lineNumber,

			text: line.text,
			gutterMarkers: [] as any[],
			textClass: 'cm-line',
			bgClass: '',
			wrapClass: '',
			widgets: [] as any,
		};
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
		onUpdate(this, defaultValue, 'CodeMirror.Init');
	}

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

		this._overlays.push(modeObject);
	}

	// TODO: Currently copied from useCursorUtils.ts.
	// TODO: Reduce code duplication.
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

