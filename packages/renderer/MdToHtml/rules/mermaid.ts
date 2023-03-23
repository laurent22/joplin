export default {

	assets: function(theme: any) {
		return [
			{ name: 'mermaid.min.js' },
			{ name: 'mermaid_render.js' },
			{
				inline: true,
				// Note: Mermaid is buggy when rendering below a certain width (500px?)
				// so set an arbitrarily high width here for the container. Once the
				// diagram is rendered it will be reset to 100% in mermaid_render.js
				text: '.mermaid { background-color: white; width: 640px; }',
				mime: 'text/css',
			},
			{
				inline: true,
				// Export button in mermaid graph should be shown only on hovering the mermaid graph
				// ref: https://github.com/laurent22/joplin/issues/6101
				text: `
				.mermaid-export-graph { visibility: hidden; } 
				.joplin-editable:hover .mermaid-export-graph { visibility: visible !important; }
				.mermaid-export-graph:hover {
					background-color: ${theme.backgroundColorHover3} !important;
				}
				`.trim(),
				mime: 'text/css',
			},
		];
	},

	plugin: function(markdownIt: any, ruleOptions: any) {
		const defaultRender: Function = markdownIt.renderer.rules.fence || function(tokens: any[], idx: number, options: any, env: any, self: any) {
			return self.renderToken(tokens, idx, options, env, self);
		};

		const exportButton = isDesktop(ruleOptions.platformName) ? exportGraphButton(ruleOptions) : '';

		markdownIt.renderer.rules.fence = function(tokens: any[], idx: number, options: {}, env: any, self: any) {
			const token = tokens[idx];
			if (token.info !== 'mermaid') return defaultRender(tokens, idx, options, env, self);
			const contentHtml = markdownIt.utils.escapeHtml(token.content);
			// Note: The mermaid script (`contentHtml`) needs to be wrapped
			// in a `pre` tag, otherwise in WYSIWYG mode TinyMCE removes
			// all the white space from it, which causes mermaid to fail.
			// See PR #4670 https://github.com/laurent22/joplin/pull/4670
			return `
				<div class="joplin-editable">
					<pre class="joplin-source" data-joplin-language="mermaid" data-joplin-source-open="\`\`\`mermaid&#10;" data-joplin-source-close="&#10;\`\`\`&#10;">${contentHtml}</pre>
					${exportButton}
					<pre class="mermaid">${contentHtml}</pre>
				</div>
			`;
		};
	},
};

function exportGraphButton(ruleOptions: any) {
	const theme: any = ruleOptions.theme;
	// Clicking on export button manually triggers a right click context menu event
	const onClickHandler = `
		const target = arguments[0].target;
		const button = target.closest("button.mermaid-export-graph");
		if (!button) return false;
		const $mermaid_elem = button.nextElementSibling;
		const rightClickEvent = new PointerEvent("contextmenu", {bubbles: true});
		rightClickEvent.target = $mermaid_elem;
		$mermaid_elem.dispatchEvent(rightClickEvent);
		return false;
	`.trim();
	const js = `onclick='${onClickHandler}'`;
	const style = `
		display: block;	
		margin-left: auto;
		border-radius: ${theme.buttonStyle.borderRadius}px;
		font-size: ${theme.fontSize}px;
		color: ${theme.color};
		background: ${theme.buttonStyle.backgroundColor};
		border: ${theme.buttonStyle.border};
	`.trim();
	const icon = downloadIcon();

	return `<button class="mermaid-export-graph" ${js} style="${style}" alt="Export mermaid graph">${icon}</button>`;
}

function downloadIcon() {
	// https://www.svgrepo.com/svg/505363/download
	return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M20 15V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18L4 15M8 11L12 15M12 15L16 11M12 15V3" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
}

function isDesktop(platformName?: string): boolean {
	if (!platformName) {
		return false;
	}

	return ['darwin', 'linux', 'freebsd', 'win32'].includes(platformName);
}
