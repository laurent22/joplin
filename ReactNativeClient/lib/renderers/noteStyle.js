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
			width: 1.2em;
			height: 1.4em;
			margin-right: 0.4em;
			background-color:  ${style.htmlLinkColor};
		}
    /* These icons are obtained from the wonderful ForkAwesome project by copying the src svgs 
     * into the css classes below.
     * svgs are obtained from https://github.com/ForkAwesome/Fork-Awesome/tree/master/src/icons/svg
     * instead of the svg width, height property you must use a viewbox here, 0 0 1536 1792 is typically the actual size of the icon
     * each line begins with the pre-amble -webkit-mask: url("data:image/svg+xml;utf8,
     * and of course finishes with ");
     * to precvent artifacts it is also necessary to include -webkit-mask-repeat: no-repeat;
     * on the following line
     * */
		.fa-joplin {
			/* Awesome Font file */
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M288 128C129 128 0 257 0 416v960c0 159 129 288 288 288h960c159 0 288-129 288-288V416c0-159-129-288-288-288H288zm449.168 236.572l263.434.565 263.431.562.584 73.412.584 73.412-42.732 1.504c-23.708.835-47.002 2.774-52.322 4.36-14.497 4.318-23.722 12.902-29.563 27.51l-5.12 12.802-1.403 291.717c-1.425 295.661-1.626 302.586-9.936 343.043-15.2 74-69.604 150.014-142.197 198.685-58.287 39.08-121.487 60.47-208.155 70.45-22.999 2.648-122.228 2.636-141.976-.024l-.002.006c-69.785-9.377-108.469-20.202-154.848-43.332-85.682-42.73-151.778-116.991-177.537-199.469-10.247-32.81-11.407-40.853-11.375-78.754.026-31.257.76-39.15 5.024-54.043 8.94-31.228 20.912-51.733 43.56-74.62 27.312-27.6 55.812-40.022 95.524-41.633 37.997-1.542 63.274 5.024 87.23 22.66 15.263 11.235 30.828 33.238 39.537 55.884 5.52 14.355 5.949 18.31 7.549 69.569 1.675 53.648 3.05 63.99 11.674 87.785 11.777 32.499 31.771 55.017 61.46 69.22 26.835 12.838 47.272 16.785 80.56 15.56 21.646-.798 30.212-2.135 43.208-6.741 38.682-13.708 70.96-44.553 86.471-82.635 16.027-39.348 15.995-38.647 15.947-361.595-.042-283.26-.09-286.272-4.568-296.153-10.958-24.171-22.488-28.492-81.074-30.377l-42.969-1.38v-147.95z'/></svg>");
		}
		.fa-file-image {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280zm-128-448v320H256v-192l192-192 128 128 384-384zm-832-192c-106 0-192-86-192-192s86-192 192-192 192 86 192 192-86 192-192 192z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file-pdf {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280zm-514-593c25 20 53 38 84 56 42-5 81-7 117-7 67 0 152 8 177 49 7 10 13 28 2 52-1 1-2 3-3 4v1c-3 18-18 38-71 38-64 0-161-29-245-73-139 15-285 46-392 83-103 176-182 262-242 262-10 0-19-2-28-7l-24-12c-3-1-4-3-6-5-5-5-9-16-6-36 10-46 64-123 188-188 8-5 18-2 23 6 1 1 2 3 2 4 31-51 67-116 107-197 45-90 80-178 104-262-32-109-42-221-24-287 7-25 22-40 42-40h22c15 0 27 5 35 15 12 14 15 36 9 68-1 3-2 6-4 8 1 3 1 5 1 8v30c-1 63-2 123-14 192 35 105 87 190 146 238zm-576 411c30-14 73-57 137-158-75 58-122 124-137 158zm398-920c-10 28-10 76-2 132 3-16 5-31 7-44 2-17 5-31 7-43 1-3 2-5 4-8-1-1-1-3-2-5-1-18-7-29-13-36 0 2-1 3-1 4zm-124 661c88-35 186-63 284-81-10-8-20-15-29-23-49-43-93-103-127-176-19 61-47 126-83 197-15 28-30 56-45 83zm646-16c-5-5-31-24-140-24 49 18 94 28 124 28 9 0 14 0 18-1 0-1-1-2-2-3z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file-word {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280zM233 768v107h70l164 661h159l128-485c5-15 8-30 10-46 1-8 2-16 2-24h4l3 24c3 14 4 30 9 46l128 485h159l164-661h70V768h-300v107h90l-99 438c-4 16-6 33-7 46l-2 21h-4c0-6-2-14-3-21-3-13-5-30-9-46L825 768H711l-144 545c-4 16-5 33-8 46l-4 21h-4l-2-21c-1-13-3-30-7-46l-99-438h90V768H233z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file-powerpoint {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280zm-992-234v106h327v-106h-93v-167h137c43 0 82-2 118-15 90-31 146-124 146-233s-54-193-137-228c-38-15-84-19-130-19H416v107h92v555h-92zm353-280H650V882h120c35 0 62 6 83 18 36 21 56 62 56 115 0 56-20 99-62 120-21 10-47 15-78 15z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file-excel {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280zm-979-234v106h281v-106h-75l103-161c12-19 18-34 21-34h2c1 4 3 7 5 10 4 8 10 14 17 24l107 161h-76v106h291v-106h-68l-192-273 195-282h67V768H828v107h74l-103 159c-12 19-21 34-21 33h-2c-1-4-3-7-5-10-4-7-9-14-17-23L648 875h76V768H434v107h68l189 272-194 283h-68z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file-audio {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280zM620 850c12 5 20 17 20 30v544c0 13-8 25-20 30-4 1-8 2-12 2-8 0-16-3-23-9l-166-167H288c-18 0-32-14-32-32v-192c0-18 14-32 32-32h131l166-167c10-9 23-12 35-7zm417 689c19 0 37-8 50-24 83-102 129-231 129-363s-46-261-129-363c-22-28-63-32-90-10-28 23-32 63-9 91 65 80 100 178 100 282s-35 202-100 282c-23 28-19 68 9 90 12 10 26 15 40 15zm-211-148c17 0 34-7 47-20 56-60 87-137 87-219s-31-159-87-219c-24-26-65-27-91-3-25 24-27 65-2 91 33 36 52 82 52 131s-19 95-52 131c-25 26-23 67 2 91 13 11 29 17 44 17z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file-video {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280zM768 768c70 0 128 58 128 128v384c0 70-58 128-128 128H384c-70 0-128-58-128-128V896c0-70 58-128 128-128h384zm492 2c12 5 20 17 20 30v576c0 13-8 25-20 30-4 1-8 2-12 2-8 0-17-3-23-9l-265-266v-90l265-266c6-6 15-9 23-9 4 0 8 1 12 2z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file-archive {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M640 384V256H512v128h128zm128 128V384H640v128h128zM640 640V512H512v128h128zm128 128V640H640v128h128zm700-388c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H768v128H640V128H128v1536h1280zM781 943c85 287 107 349 107 349 5 17 8 34 8 52 0 111-108 192-256 192s-256-81-256-192c0-18 3-35 8-52 0 0 21-62 120-396V768h128v128h79c29 0 54 19 62 47zm-141 465c71 0 128-29 128-64s-57-64-128-64-128 29-128 64 57 64 128 64z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file-code {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280zM480 768c11-14 31-17 45-6l51 38c14 11 17 31 6 45l-182 243 182 243c11 14 8 34-6 45l-51 38c-14 11-34 8-45-6l-226-301c-8-11-8-27 0-38zm802 301c8 11 8 27 0 38l-226 301c-11 14-31 17-45 6l-51-38c-14-11-17-31-6-45l182-243-182-243c-11-14-8-34 6-45l51-38c14-11 34-8 45 6zm-620 461c-18-3-29-20-26-37l138-831c3-18 20-29 37-26l63 10c18 3 29 20 26 37l-138 831c-3 18-20 29-37 26z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file-alt, .fa-file-csv {
      /* fork-awesome doesn't have csv so we use the text icon */
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280zM384 800c0-18 14-32 32-32h704c18 0 32 14 32 32v64c0 18-14 32-32 32H416c-18 0-32-14-32-32v-64zm736 224c18 0 32 14 32 32v64c0 18-14 32-32 32H416c-18 0-32-14-32-32v-64c0-18 14-32 32-32h704zm0 256c18 0 32 14 32 32v64c0 18-14 32-32 32H416c-18 0-32-14-32-32v-64c0-18 14-32 32-32h704z'/></svg>");
      -webkit-mask-repeat: no-repeat;
		}
		.fa-file {
			-webkit-mask: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1536 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1468 380c37 37 68 111 68 164v1152c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0h896c53 0 127 31 164 68zm-444-244v376h376c-6-17-15-34-22-41l-313-313c-7-7-24-16-41-22zm384 1528V640H992c-53 0-96-43-96-96V128H128v1536h1280z'/></svg>");
      -webkit-mask-repeat: no-repeat;
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

			#joplin-container-content {
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
