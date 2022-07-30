//
// Exports a list of languages that can be used in fenced code blocks.
//

import { LanguageDescription, LanguageSupport, StreamParser } from '@codemirror/language';
import { StreamLanguage } from '@codemirror/language';

import { python } from '@codemirror/legacy-modes/mode/python';
import { c, dart } from '@codemirror/legacy-modes/mode/clike';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { r } from '@codemirror/legacy-modes/mode/r';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { go } from '@codemirror/legacy-modes/mode/go';
import { vb } from '@codemirror/legacy-modes/mode/vb';
import { vbScript } from '@codemirror/legacy-modes/mode/vbscript';
import { css } from '@codemirror/legacy-modes/mode/css';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { groovy } from '@codemirror/legacy-modes/mode/groovy';
import { perl } from '@codemirror/legacy-modes/mode/perl';
import { cobol } from '@codemirror/legacy-modes/mode/cobol';
import { julia } from '@codemirror/legacy-modes/mode/julia';
import { haskell } from '@codemirror/legacy-modes/mode/haskell';
import { pascal } from '@codemirror/legacy-modes/mode/pascal';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { xml } from '@codemirror/legacy-modes/mode/xml';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile';
import { diff } from '@codemirror/legacy-modes/mode/diff';
import { erlang } from '@codemirror/legacy-modes/mode/erlang';
import { sqlite, standardSQL, mySQL } from '@codemirror/legacy-modes/mode/sql';

import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { cpp } from '@codemirror/lang-cpp';
import { php } from '@codemirror/lang-php';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';

const supportedLanguages: {
	name: string;
	aliases?: string[];

	// Either support or parser must be given
	parser?: StreamParser<any>;
	support?: LanguageSupport;
}[] = [
	// Based on @joplin/desktop/CodeMirror/Editor.tsx

	{
		name: 'LaTeX',
		aliases: ['tex', 'latex', 'luatex'],
		parser: stex,
	},
	{
		name: 'python',
		aliases: ['py'],
		parser: python,
	},
	{
		name: 'clike',
		aliases: ['c', 'h'],
		parser: c,
	},
	{
		name: 'C++',
		aliases: ['cpp', 'hpp', 'cxx', 'hxx', 'c++'],
		support: cpp(),
	},
	{
		name: 'java',
		support: java(),
	},
	{
		name: 'javascript',
		aliases: ['js', 'mjs'],
		support: javascript(),
	},
	{
		name: 'typescript',
		aliases: ['ts'],
		support: javascript({ jsx: false, typescript: true }),
	},
	{
		name: 'react javascript',
		aliases: ['jsx'],
		support: javascript({ jsx: true, typescript: false }),
	},
	{
		name: 'react typescript',
		aliases: ['tsx'],
		support: javascript({ jsx: true, typescript: true }),
	},
	{
		name: 'lua',
		parser: lua,
	},
	{
		name: 'php',
		support: php(),
	},
	{
		name: 'r',
		parser: r,
	},
	{
		name: 'swift',
		parser: swift,
	},
	{
		name: 'go',
		parser: go,
	},
	{
		name: 'visualbasic',
		aliases: ['vb'],
		parser: vb,
	},
	{
		name: 'visualbasicscript',
		aliases: ['vbscript', 'vbs'],
		parser: vbScript,
	},
	{
		name: 'ruby',
		aliases: ['rb'],
		parser: ruby,
	},
	{
		name: 'rust',
		aliases: ['rs'],
		support: rust(),
	},
	{
		name: 'dart',
		parser: dart,
	},
	{
		name: 'groovy',
		parser: groovy,
	},
	{
		name: 'perl',
		aliases: ['pl'],
		parser: perl,
	},
	{
		name: 'cobol',
		aliases: ['cbl', 'cob'],
		parser: cobol,
	},
	{
		name: 'julia',
		aliases: ['jl'],
		parser: julia,
	},
	{
		name: 'haskell',
		aliases: ['hs'],
		parser: haskell,
	},
	{
		name: 'pascal',
		parser: pascal,
	},
	{
		name: 'css',
		parser: css,
	},
	{
		name: 'xml',
		aliases: ['xhtml'],
		parser: xml,
	},
	{
		name: 'html',
		aliases: ['html', 'htm'],
		support: html(),
	},
	{
		name: 'markdown',
		support: markdown(),
	},
	{
		name: 'yaml',
		parser: yaml,
	},
	{
		name: 'shell',
		aliases: ['bash', 'sh', 'zsh', 'dash'],
		parser: shell,
	},
	{
		name: 'dockerfile',
		parser: dockerFile,
	},
	{
		name: 'diff',
		parser: diff,
	},
	{
		name: 'erlang',
		parser: erlang,
	},
	{
		name: 'sql',
		parser: standardSQL,
	},
	{
		name: 'sqlite',
		parser: sqlite,
	},
	{
		name: 'mysql',
		parser: mySQL,
	},
];

// Convert supportedLanguages to a CodeMirror-readable list
// of LanguageDescriptions
const syntaxHighlightingLanguages: LanguageDescription[] = [];
for (const language of supportedLanguages) {
	// Convert from parsers to LanguageSupport objects as necessary
	const support = language.support ?? new LanguageSupport(StreamLanguage.define(language.parser));

	syntaxHighlightingLanguages.push(
		LanguageDescription.of({
			name: language.name,
			alias: language.aliases,
			support,
		})
	);
}

export default syntaxHighlightingLanguages;
