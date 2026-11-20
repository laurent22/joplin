import compactCss from './compactCss';

describe('compactCss', () => {

	test.each([
		['  .a  >  b {\n    color : red ;\n    margin: 0 auto;\n  }\n', '.a > b{color : red;margin: 0 auto;}'],
		['a :hover { color: red; }', 'a :hover{color: red;}'],
		['/* comment */ a { /* inner */ color: red; }', 'a{color: red;}'],
		['a::before { content: "  two  /* not a comment */  spaces  "; }', 'a::before{content: "  two  /* not a comment */  spaces  ";}'],
		['a::before { content: \'it\\\'s  fine\'; }', 'a::before{content: \'it\\\'s  fine\';}'],
		['@layer base { a { color: red; } }\n.after { color: green; }', '@layer base{a{color: red;}\n}\n.after{color: green;}'],
		['@container (min-width: 400px) { .c { display: grid; } }', '@container (min-width: 400px){.c{display: grid;}\n}'],
		['.a { color: red; &:hover { color: blue; } }', '.a{color: red;&:hover{color: blue;}\n}'],
		['* { --tw-ring-inset: ; --x: 1px; }', '*{--tw-ring-inset: ;--x: 1px;}'],
		['a { background: url(data:image/png;base64,iVBORw0KGgo=) no-repeat; }', 'a{background: url(data:image/png;base64,iVBORw0KGgo=) no-repeat;}'],
		['color:   red ;   margin:0', 'color: red;margin:0'],
		['screen   and  (max-width: 600px)', 'screen and (max-width: 600px)'],
		['a { content: "unterminated\n  b { color: red; }', 'a{content: "unterminated\nb{color: red;}'],
		['', ''],
	])('should compact %j', (css, expected) => {
		expect(compactCss(css)).toBe(expected);
	});

	test('should not indent any line, and end a line after each rule', () => {
		const css = Array.from({ length: 50 }, (_, i) => `\t\t.c${i} {\n\t\t\tcolor: red;\n\t\t}`).join('\n\n');
		const lines = compactCss(css).split('\n');
		expect(lines.length).toBe(50);
		expect(lines.filter(line => /^\s/.test(line))).toEqual([]);
	});

	test.each([
		['strings', '"" '.repeat(500_000)],
		['opening braces', '{'.repeat(1_000_000)],
		['comments', '/*'.repeat(500_000)],
		['whitespace', ' '.repeat(1_000_000)],
	])('should compact many %s quickly', (_case, css) => {
		const startTime = Date.now();
		compactCss(css);
		// Takes ~50ms normally. A quadratic implementation would take minutes, so a generous limit avoids failing on a loaded CI machine.
		expect(Date.now() - startTime).toBeLessThan(10_000);
	});
});
