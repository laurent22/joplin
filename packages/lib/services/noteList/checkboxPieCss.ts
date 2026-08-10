// Shared CSS for checkbox completion pie chart used in note list renderers

const checkboxPieCss = // css
`
	.checkbox-pie > .pie {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: conic-gradient(
			var(--joplin-color4) calc(var(--percent) * 1%),
			var(--joplin-background-color) calc(var(--percent) * 1%)
		);
		border: 1px solid var(--joplin-color-faded);
		box-sizing: border-box;
	}

	.checkbox-pie > .pie.-complete {
		background: var(--joplin-background-color);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		color: var(--joplin-color4);
	}
`;

export default checkboxPieCss;
