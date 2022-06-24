// Languages supported by code regions


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
	// 'python': [ 'py', ],
	{
		name: 'python',
		aliases: ['py'],
		parser: python,
	},
	// 'clike': [ 'c', 'h', ],
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
	// 'javascript': [ 'js', ],
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
	// 'jsx': [],
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
	// 'lua': [],
	{
		name: 'lua',
		parser: lua,
	},
	// 'php': [],
	{
		name: 'php',
		support: php(),
	},
	// 'r': [],
	{
		name: 'r',
		parser: r,
	},
	// 'swift': [],
	{
		name: 'swift',
		parser: swift,
	},
	// 'go': [],
	{
		name: 'go',
		parser: go,
	},
	// 'vb': [ 'visualbasic' ],
	{
		name: 'visualbasic',
		aliases: ['vb'],
		parser: vb,
	},
	// 'vbscript': [ 'vbs' ],
	{
		name: 'visualbasicscript',
		aliases: ['vbscript', 'vbs'],
		parser: vbScript,
	},
	// 'ruby': [],
	{
		name: 'ruby',
		aliases: ['rb'],
		parser: ruby,
	},
	// 'rust': [],
	{
		name: 'rust',
		aliases: ['rs'],
		support: rust(),
	},
	// 'dart': [],
	{
		name: 'dart',
		parser: dart,
	},
	// 'groovy': [],
	{
		name: 'groovy',
		parser: groovy,
	},
	// 'perl': [],
	{
		name: 'perl',
		aliases: ['pl'],
		parser: perl,
	},
	// 'cobol': [],
	{
		name: 'cobol',
		aliases: ['cbl', 'cob'],
		parser: cobol,
	},
	// 'julia': [],
	{
		name: 'julia',
		aliases: ['jl'],
		parser: julia,
	},
	// 'haskell': [],
	{
		name: 'haskell',
		aliases: ['hs'],
		parser: haskell,
	},
	// 'pascal': [],
	{
		name: 'pascal',
		parser: pascal,
	},
	// 'css': [],
	{
		name: 'css',
		parser: css,
	},
	// 'xml': [ 'html', 'xhtml' ],
	{
		name: 'html',
		aliases: ['html', 'htm'],
		support: html(),
	},
	// 'markdown': [ 'md' ],
	{
		name: 'markdown',
		aliases: ['md'],
		support: markdown(),
	},
	// 'yaml': [],
	{
		name: 'yaml',
		parser: yaml,
	},
	// 'shell': [ 'bash', 'sh', 'zsh', ],
	{
		name: 'shell',
		aliases: ['bash', 'sh', 'zsh', 'dash'],
		parser: shell,
	},
	// 'dockerfile': [],
	{
		name: 'dockerfile',
		parser: dockerFile,
	},
	// 'diff': [],
	{
		name: 'diff',
		parser: diff,
	},
	// 'erlang': [],
	{
		name: 'erlang',
		parser: erlang,
	},
	// 'sql': [],
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
