import { CodeMirrorVersion } from './types';

// CodeMirror and Electron register accelerators slightly different
// CodeMirror requires a - between keys while Electron want's a +
// CodeMirror doesn't recognize Option (it uses Alt instead)
// CodeMirror requires Shift to be first
// CodeMirror 6 requires Shift if the key name is uppercase.
const normalizeAccelerator = (accelerator: string, editorVersion: CodeMirrorVersion) => {
	const command = accelerator.replace(/\+/g, '-').replace('Option', 'Alt');
	// From here is taken out of codemirror/lib/codemirror.js, modified
	// to also support CodeMirror 6.
	const parts = command.split(/-(?!$)/);
	let name = parts[parts.length - 1];

	if (editorVersion === CodeMirrorVersion.CodeMirror6) {
		// In CodeMirror 6, an uppercase single-letter key name makes the editor
		// require the shift key to activate the shortcut. If a key name like `Up`,
		// however, `.toLowerCase` breaks the shortcut.
		if (name.length === 1) {
			name = name.toLowerCase();
		}

		if (['Up', 'Down', 'Left', 'Right'].includes(name)) {
			name = `Arrow${name}`;
		}
	}

	let alt, ctrl, shift, cmd;
	for (let i = 0; i < parts.length - 1; i++) {
		const mod = parts[i];
		if (/^(cmd|meta|m)$/i.test(mod)) { cmd = true; } else if (/^a(lt)?$/i.test(mod)) { alt = true; } else if (/^(c|ctrl|control)$/i.test(mod)) { ctrl = true; } else if (/^s(hift)?$/i.test(mod)) { shift = true; } else { throw new Error(`Unrecognized modifier name: ${mod}`); }
	}
	if (alt) { name = `Alt-${name}`; }
	if (ctrl) { name = `Ctrl-${name}`; }
	if (cmd) { name = `Cmd-${name}`; }
	if (shift) { name = `Shift-${name}`; }
	return name;
	// End of code taken from codemirror/lib/codemirror.js
};

export default normalizeAccelerator;
