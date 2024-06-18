import htmlUtils, { extractHtmlBody, htmlDocIsImageOnly } from './htmlUtils';

describe('htmlUtils', () => {

	test('should strip off HTML', () => {
		const testCases = [
			[
				'',
				'',
			],
			[
				'<b>test</b>',
				'test',
			],
			[
				'Joplin&circledR;',
				'Joplin®',
			],
			[
				'&lt;b&gttest&lt;/b&gt',
				'&lt;b>test&lt;/b>',
			],
		];

		for (const t of testCases) {
			const [input, expected] = t;
			const actual = htmlUtils.stripHtml(input);
			expect(actual).toBe(expected);
		}
	});

	test('should extract the HTML body', () => {
		const testCases: [string, string][] = [
			[
				'Just <b>testing</b>',
				'Just <b>testing</b>',
			],
			[
				'',
				'',
			],
			[
				'<html><head></head><meta bla><body>Here is the body<img src="test.png"/></body></html>',
				'Here is the body<img src="test.png"/>',
			],
		];

		for (const [input, expected] of testCases) {
			const actual = extractHtmlBody(input);
			expect(actual).toBe(expected);
		}
	});

	test('should tell if an HTML document is an image only', () => {
		const testCases: [string, boolean][] = [
			[
				// This is the kind of HTML that's pasted when copying an image from Chrome
				'<meta charset=\'utf-8\'>\n<img src="https://example.com/img.png"/>',
				true,
			],
			[
				'',
				false,
			],
			[
				'<img src="https://example.com/img.png"/>',
				true,
			],
			[
				'<img src="https://example.com/img.png"/><img src="https://example.com/img.png"/>',
				false,
			],
			[
				'<img src="https://example.com/img.png"/><p>Some text</p>',
				false,
			],
			[
				'<img src="https://example.com/img.png"/> Some text',
				false,
			],
		];

		for (const [input, expected] of testCases) {
			const actual = htmlDocIsImageOnly(input);
			expect(actual).toBe(expected);
		}
	});

	test('should turn SVG nodes into base64 nodes', () => {
		const testCases = [
			`<div><svg xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 0 24 24" fill="none">
				<path d="M7 12H17M8 8.5C8 8.5 9 9 10 9C11.5 9 12.5 8 14 8C15 8 16 8.5 16 8.5M8 15.5C8 15.5 9 16 10 16C11.5 16 12.5 15 14 15C15 15 16 15.5 16 15.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
				</svg></div>`,
			`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="391" height="391" viewBox="-70.5 -70.5 391 391">
<defs>
	<pattern id="grid" patternUnits="userSpaceOnUse" width="50" height="50">
		<rect x="0" y="0" width="50" height="1" fill="#000" opacity="1.0"/>
		<rect x="0" y="0" width="1" height="50" fill="#000" opacity="1.0"/>
	</pattern>
</defs>
<rect fill="#fff" stroke="#000" x="-70" y="-70" width="390" height="390"/>
<rect fill="url(#grid)" stroke-width="2" stroke="#000" x="0" y="0" width="250" height="250"/>
<text x="0" y="0" text-anchor="middle" font-size="16" font-family="Granada,Times New Roman,serif">
<tspan x="125" y="-40" font-weight="bold" font-size="1.2em">x</tspan>
<tspan x="0" y="-10">0</tspan>
<tspan x="50" y="-10">50</tspan>
<tspan x="100" y="-10">100</tspan>
<tspan x="150" y="-10">150</tspan>
<tspan x="200" y="-10">200</tspan>
<tspan x="250" y="-10">250</tspan>
</text>
<text x="0" y="0" text-anchor="middle" font-size="16" font-family="Granada,Times New Roman,serif">
<tspan x="-50" y="125" font-weight="bold" font-size="1.2em">y</tspan>
<tspan x="-20" y="0" dy="6">0</tspan>
<tspan x="-20" y="50" dy="6">50</tspan>
<tspan x="-20" y="100" dy="6">100</tspan>
<tspan x="-20" y="150" dy="6">150</tspan>
<tspan x="-20" y="200" dy="6">200</tspan>
<tspan x="-20" y="250" dy="6">250</tspan>
</text>
<g opacity="0.8">
	<rect x="25" y="25" width="200" height="200" fill="lime" stroke-width="4" stroke="pink"/>
	<circle cx="125" cy="125" r="75" fill="orange"/>
	<polyline points="50,150 50,200 200,200 200,100" stroke="red" stroke-width="4" fill="none"/>
	<line x1="50" y1="50" x2="200" y2="200" stroke="blue" stroke-width="4"/>
</g></svg>`,
			// animateMotion doesn't work, but still should create the image
			`<svg viewBox="0 0 307 184" xmlns="http://www.w3.org/2000/svg">
        <g id="track">
          <g id="track-lines">
            <path
              fill="none"
              stroke="#facc15"
              d="M167.88,111.3
                  c3.11,0,6.12,1.44,8.06,3.96l30.58,39.82c1.75,2.28,4.95,2.91,7.43,1.46l64.07-37.37c1.75-1.02,2.84-2.92,2.84-4.95V96.04
                  c0-1.64-0.71-3.21-1.94-4.29c-1.23-1.09-2.87-1.59-4.5-1.39l-9.83,1.23c-4.66,0.58-8.96-1.96-10.68-6.34
                  c-1.73-4.37-0.33-9.16,3.48-11.93l0.19-0.14c2.48-1.8,2.71-4.49,2.09-6.41c-0.62-1.91-2.38-3.96-5.45-3.96
                  c-3.66,0-7.05-1.98-8.84-5.18L229.65,29.6c-1.01-1.8-2.93-2.93-5-2.93H155.2c-1.59,0-3.12,0.67-4.2,1.83l-28.78,31.06
                  c-1.91,2.06-4.62,3.25-7.43,3.25H31.87c-3.16,0-5.73,2.57-5.73,5.73v32.5c0,2.68,1.83,4.98,4.44,5.58l35.59-1.79
                  c3.27,0.76,23.73,23.28,26.51,22.67l73.06-15.98C166.45,111.38,167.17,111.3,167.88,111.3z"
            />
          </g>

          <g id="pink-car">
            <animateMotion
              dur="4s"
              repeatCount="indefinite"
              rotate="auto"
              path="M167.88,111.3
                      c3.11,0,6.12,1.44,8.06,3.96l30.58,39.82c1.75,2.28,4.95,2.91,7.43,1.46l64.07-37.37c1.75-1.02,2.84-2.92,2.84-4.95V96.04
                      c0-1.64-0.71-3.21-1.94-4.29c-1.23-1.09-2.87-1.59-4.5-1.39l-9.83,1.23c-4.66,0.58-8.96-1.96-10.68-6.34
                      c-1.73-4.37-0.33-9.16,3.48-11.93l0.19-0.14c2.48-1.8,2.71-4.49,2.09-6.41c-0.62-1.91-2.38-3.96-5.45-3.96
                      c-3.66,0-7.05-1.98-8.84-5.18L229.65,29.6c-1.01-1.8-2.93-2.93-5-2.93H155.2c-1.59,0-3.12,0.67-4.2,1.83l-28.78,31.06
                      c-1.91,2.06-4.62,3.25-7.43,3.25H31.87c-3.16,0-5.73,2.57-5.73,5.73v32.5c0,2.68,1.83,4.98,4.44,5.58l35.59-1.79
                      c3.27,0.76,23.73,23.28,26.51,22.67l73.06-15.98C166.45,111.38,167.17,111.3,167.88,111.3z"
            />
            <path
              class="car"
              fill="#EC4899"
              style="transform: translate(-12px, -12px)"
              d="M13.71,18.65c0.25-0.5,0.25-0.92,0.2-1.2h2.59c0.08,0.22,0.28,0.39,0.53,0.39h2.31c0.25,0,0.46-0.16,0.53-0.39
                  h2.32c0,0,0.07-0.11,0.17-0.31h0.28c0,0,1.03-1.41,1.03-5.14c0-3.74-1.03-5.14-1.03-5.14h-0.28c-0.1-0.2-0.17-0.31-0.17-0.31h-2.32
                  c-0.08-0.22-0.28-0.39-0.53-0.39h-2.31c-0.25,0-0.46,0.16-0.53,0.39h-2.59c0.05-0.29,0.05-0.7-0.2-1.2
                  c-0.16-0.32-0.28-0.33-0.37-0.19c-0.17,0.28-0.17,1.16,0.05,1.38c0,0,0.01,0.01,0.01,0.01H6.35C6.27,6.33,6.06,6.16,5.81,6.16H3.5
                  c-0.25,0-0.46,0.16-0.53,0.39H2.62c-0.18,0-0.36,0.03-0.52,0.08C1.59,6.79,1.16,7.17,0.97,7.69C0.85,8,0.74,8.37,0.63,8.82
                  C0.45,9.63,0.31,10.68,0.31,12s0.14,2.37,0.33,3.18c0.1,0.45,0.22,0.82,0.34,1.13c0.2,0.52,0.62,0.91,1.13,1.06
                  c0.17,0.05,0.34,0.08,0.52,0.08h0.34c0.08,0.22,0.28,0.39,0.53,0.39h2.31c0.25,0,0.46-0.16,0.53-0.39h7.06c0,0-0.01,0.01-0.01,0.01
                  c-0.22,0.21-0.22,1.1-0.05,1.38C13.43,18.98,13.55,18.97,13.71,18.65z M13.06,16.15c0,0-0.98-0.25-1.85-1.36
                  c-0.1-0.13-0.16-0.29-0.16-0.45v-2.39V9.55c0-0.16,0.06-0.32,0.16-0.45c0.87-1.11,1.85-1.36,1.85-1.36
                  c0.51,1.4,0.52,4.21,0.52,4.21S13.57,14.75,13.06,16.15z M23.21,10.15c-1.21-1-0.89-2.11-0.57-2.7
                  C22.85,8.03,23.09,8.91,23.21,10.15z M7.56,7.53h4.56c0,0-0.46,1.09-1.68,1.09s-0.73,0-1.69,0S7.56,7.53,7.56,7.53z M6.59,15.41
                  c-1.27,0-2.3-1.03-2.3-2.3v-1.17v-1.16c0-1.27,1.03-2.3,2.3-2.3h0.18v6.93H6.59z M8.75,15.26c0.96,0,0.48,0,1.69,0
                  s1.68,1.09,1.68,1.09l-4.56,0.11C7.56,16.47,7.78,15.26,8.75,15.26z M23.21,13.85c-0.12,1.24-0.36,2.12-0.57,2.7
                  C22.32,15.95,22,14.85,23.21,13.85z"
            />
          </g>
        </g>
      </svg>`,
			// should NOT execute js
			`<svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
				<circle cx="50" cy="50" r="45" fill="green"
						id="foo"/>
				<script type="text/javascript">
					// <![CDATA[
					document.getElementById("foo").setAttribute("fill", "blue");
					alert("something went wrong!"):
					// ]]>
				</script>
			</svg>`,
			// more than one svg at the same document:
			`<div>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M220.6 121.2L271.1 96 448 96v96H333.2c-21.9-15.1-48.5-24-77.2-24s-55.2 8.9-77.2 24H64V128H192c9.9 0 19.7-2.3 28.6-6.8zM0 128V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H271.1c-9.9 0-19.7 2.3-28.6 6.8L192 64H160V48c0-8.8-7.2-16-16-16H80c-8.8 0-16 7.2-16 16l0 16C28.7 64 0 92.7 0 128zM168 304a88 88 0 1 1 176 0 88 88 0 1 1 -176 0z"/></svg>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h96 32H424c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/></svg>
			<div>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>
				<div>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M234.7 42.7L197 56.8c-3 1.1-5 4-5 7.2s2 6.1 5 7.2l37.7 14.1L248.8 123c1.1 3 4 5 7.2 5s6.1-2 7.2-5l14.1-37.7L315 71.2c3-1.1 5-4 5-7.2s-2-6.1-5-7.2L277.3 42.7 263.2 5c-1.1-3-4-5-7.2-5s-6.1 2-7.2 5L234.7 42.7zM46.1 395.4c-18.7 18.7-18.7 49.1 0 67.9l34.6 34.6c18.7 18.7 49.1 18.7 67.9 0L529.9 116.5c18.7-18.7 18.7-49.1 0-67.9L495.3 14.1c-18.7-18.7-49.1-18.7-67.9 0L46.1 395.4zM484.6 82.6l-105 105-23.3-23.3 105-105 23.3 23.3zM7.5 117.2C3 118.9 0 123.2 0 128s3 9.1 7.5 10.8L64 160l21.2 56.5c1.7 4.5 6 7.5 10.8 7.5s9.1-3 10.8-7.5L128 160l56.5-21.2c4.5-1.7 7.5-6 7.5-10.8s-3-9.1-7.5-10.8L128 96 106.8 39.5C105.1 35 100.8 32 96 32s-9.1 3-10.8 7.5L64 96 7.5 117.2zm352 256c-4.5 1.7-7.5 6-7.5 10.8s3 9.1 7.5 10.8L416 416l21.2 56.5c1.7 4.5 6 7.5 10.8 7.5s9.1-3 10.8-7.5L480 416l56.5-21.2c4.5-1.7 7.5-6 7.5-10.8s-3-9.1-7.5-10.8L480 352l-21.2-56.5c-1.7-4.5-6-7.5-10.8-7.5s-9.1 3-10.8 7.5L416 352l-56.5 21.2z"/></svg>
				</div>
			</div>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>
			</div>
			`,
			// should be an empty SVG tag, script should be dropped
			`<svg>
				<script type="text/javascript">
					alert("something went wrong!"):
				</script>
			</svg>`,
			// test with text adn style
			`<svg viewBox="0 0 240 80" xmlns="http://www.w3.org/2000/svg">
  <style>
    .small {
      font: italic 13px sans-serif;
    }
    .heavy {
      font: bold 30px sans-serif;
    }

    /* Note that the color of the text is set with the    *
     * fill property, the color property is for HTML only */
    .Rrrrr {
      font: italic 40px serif;
      fill: red;
    }
  </style>

  <text x="20" y="35" class="small">My</text>
  <text x="40" y="35" class="heavy">cat</text>
  <text x="55" y="55" class="small">is</text>
  <text x="65" y="55" class="Rrrrr">Grumpy!</text>
</svg>`,
		];

		for (let i = 0; i < testCases.length; i++) {
			expect(htmlUtils.sanitizeHtml(testCases[i])).toMatchSnapshot(i.toString());
		}

	});

});
