module.exports = function(style, options) {
	// https://necolas.github.io/normalize.css/
	const normalizeCss = `
		html{line-height:1.15;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}body{margin:0}
		article,aside,footer,header,nav,section{display:block}h1{font-size:2em;margin:.67em 0}hr{box-sizing:content-box;height:0;overflow:visible}
		pre{font-family:monospace,monospace;font-size:1em}a{background-color:transparent;-webkit-text-decoration-skip:objects}
		b,strong{font-weight:bolder}small{font-size:80%}img{border-style:none}
	`;

	const fontFamily = '\'Avenir\', \'Arial\', sans-serif';

	const css =
		`
		body {
			font-size: ${style.htmlFontSize};
			color: ${style.htmlColor};
			line-height: ${style.htmlLineHeight};
			background-color: ${style.htmlBackgroundColor};
			font-family: ${fontFamily};
			padding-bottom: ${options.paddingBottom};
		}
		strong {
			color: ${style.colorBright};
		}
		kbd {
			border: 1px solid ${style.htmlCodeBorderColor};
			box-shadow: inset 0 -1px 0 ${style.htmlCodeBorderColor};
			padding: 2px 4px;
			border-radius: 3px;
			background-color: ${style.htmlCodeBackgroundColor};
		}
		::-webkit-scrollbar {
			width: 7px;
			height: 7px;
		}
		::-webkit-scrollbar-corner {
			background: none;
		}
		::-webkit-scrollbar-track {
			border: none;
		}
		::-webkit-scrollbar-thumb {
			background: rgba(100, 100, 100, 0.3); 
			border-radius: 5px;
		}
		::-webkit-scrollbar-track:hover {
			background: rgba(0, 0, 0, 0.1); 
		}
		::-webkit-scrollbar-thumb:hover {
			background: rgba(100, 100, 100, 0.7); 
		}

		/* Remove top padding and margin from first child so that top of rendered text is aligned to top of text editor text */
		#rendered-md h1:first-child,
		#rendered-md h2:first-child,
		#rendered-md h3:first-child,
		#rendered-md h4:first-child,
		#rendered-md ul:first-child,
		#rendered-md ol:first-child,
		#rendered-md table:first-child,
		#rendered-md blockquote:first-child,
		#rendered-md img:first-child,
		#rendered-md p:first-child {
			margin-top: 0;
			padding-top: 0;
		}
		
		p, h1, h2, h3, h4, h5, h6, ul, table {
			margin-top: .6em;
			margin-bottom: .65em;
		}
		h1, h2, h3, h4, h5, h6 {
			line-height: 1.5em;
		}
		h1 {
			font-size: 1.5em;
			font-weight: bold;
			border-bottom: 1px solid ${style.htmlDividerColor};
			padding-bottom: .3em;
		}
		h2 {
			font-size: 1.3em;
			font-weight: bold;
			padding-bottom: .1em; */
		}
		h3 {
			font-size: 1.1em;
		}
		h4, h5, h6 {
			font-size: 1em;
			font-weight: bold;
		}
		a {
			color: ${style.htmlLinkColor};
		}
		ul, ol {
			padding-left: 0;
			margin-left: 1.7em;
		}
		li {
			margin-bottom: .4em;
		}
		li p {
			margin-top: 0.2em;
			margin-bottom: 0;
		}
		.resource-icon {
			display: inline-block;
			position: relative;
			top: .5em;
			text-decoration: none;
			width: 1.15em;
			height: 1.45em;
			margin-right: 0.4em;
			background-color:  ${style.htmlColor};
			/* Awesome Font file */
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1892' xmlns='http://www.w3.org/2000/svg'><path d='M288 128C129 128 0 257 0 416v960c0 159 129 288 288 288h960c159 0 288-129 288-288V416c0-159-129-288-288-288H288zm449.168 236.572l263.434.565 263.431.562.584 73.412.584 73.412-42.732 1.504c-23.708.835-47.002 2.774-52.322 4.36-14.497 4.318-23.722 12.902-29.563 27.51l-5.12 12.802-1.403 291.717c-1.425 295.661-1.626 302.586-9.936 343.043-15.2 74-69.604 150.014-142.197 198.685-58.287 39.08-121.487 60.47-208.155 70.45-22.999 2.648-122.228 2.636-141.976-.024l-.002.006c-69.785-9.377-108.469-20.202-154.848-43.332-85.682-42.73-151.778-116.991-177.537-199.469-10.247-32.81-11.407-40.853-11.375-78.754.026-31.257.76-39.15 5.024-54.043 8.94-31.228 20.912-51.733 43.56-74.62 27.312-27.6 55.812-40.022 95.524-41.633 37.997-1.542 63.274 5.024 87.23 22.66 15.263 11.235 30.828 33.238 39.537 55.884 5.52 14.355 5.949 18.31 7.549 69.569 1.675 53.648 3.05 63.99 11.674 87.785 11.777 32.499 31.771 55.017 61.46 69.22 26.835 12.838 47.272 16.785 80.56 15.56 21.646-.798 30.212-2.135 43.208-6.741 38.682-13.708 70.96-44.553 86.471-82.635 16.027-39.348 15.995-38.647 15.947-361.595-.042-283.26-.09-286.272-4.568-296.153-10.958-24.171-22.488-28.492-81.074-30.377l-42.969-1.38v-147.95z'/></svg>");
		}
		blockquote {
			border-left: 4px solid ${style.htmlCodeBorderColor};
			padding-left: 1.2em;
			margin-left: 0;
			opacity: .7;
		}
		table {
			text-align: left-align;
			border-collapse: collapse;
			border: 1px solid ${style.htmlCodeBorderColor};
			background-color: ${style.htmlBackgroundColor};
		}
		td, th {
			padding: .5em 1em .5em 1em;
			font-size: ${style.htmlFontSize};
			color: ${style.htmlColor};
			font-family: ${fontFamily};
		}
		td {
			border: 1px solid ${style.htmlCodeBorderColor};
		}
		th {
			border: 1px solid ${style.htmlCodeBorderColor};
			border-bottom: 2px solid ${style.htmlCodeBorderColor};
			background-color: ${style.htmlTableBackgroundColor};
		}
		tr:nth-child(even) {
			background-color: ${style.htmlTableBackgroundColor};
		}
		tr:hover {
			background-color: ${style.raisedBackgroundColor};
		}
		hr {
			border: none;
			border-bottom: 2px solid ${style.htmlDividerColor};
		}
		img {
			max-width: 100%;
			height: auto;
		}
		.inline-code {
			border: 1px solid ${style.htmlCodeBorderColor};
			background-color: ${style.htmlCodeBackgroundColor};
			padding-right: .2em;
			padding-left: .2em;
			border-radius: .25em;
			color: ${style.htmlCodeColor};
			font-size: ${style.htmlCodeFontSize};
		}

		.highlighted-keyword {
			background-color: #F3B717;
			color: black;
		}

		.not-loaded-resource img {
			width: 1.15em;
			height: 1.15em;
			background: white;
			padding: 2px !important;
			border-radius: 2px;
			box-shadow: 0 1px 3px #000000aa;
		}

		a.not-loaded-resource img {
			margin-right: .2em;
		}

		a.not-loaded-resource {
			display: flex;
			flex-direction: row;
			align-items: center;
		}

		.md-checkbox input[type=checkbox]:checked {
			opacity: 0.7;
		}

		.md-checkbox .checkbox-label-checked {
			opacity: 0.5;
		}

		@media print {
			body {
				height: auto !important;
			}

			pre {
				white-space: pre-wrap;
			}

			.code, .inline-code {
				border: 1px solid #CBCBCB;
			}

			#content {
				/* The height of the content is set dynamically by JavaScript (in updateBodyHeight) to go
				   around various issues related to scrolling. However when printing we don't want this
				   fixed size as that would crop the content. So we set it to auto here. "important" is
				   needed to override the style set by JavaScript at the element-level. */
				height: auto !important;
			}
		}
	`;

	return [normalizeCss, css];
};
