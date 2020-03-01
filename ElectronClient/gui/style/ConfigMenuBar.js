const { createSelector } = require('reselect');
const { themeStyle } = require('../../theme.js');

const themeSelector = (state, props) => themeStyle(props.theme);

const style = createSelector(
	themeSelector,
	(theme) => {
		const output = {
			button: {
				fontFamily: theme.fontFamily,
				minWidth: 52,
				border: 'none',
				flexDirection: 'column',
				display: 'flex',
				alignItems: 'center',
				padding: 9,
				backgroundColor: theme.backgroundColor,
			},
			buttonIcon: {
				fontSize: 24,
				color: theme.colorFaded,
			},
			buttonLabel: {
				display: 'flex',
				flex: 1,
				alignItems: 'flex-end',
				color: theme.colorFaded,
			},
			root: {
				minHeight: 58,
				display: 'flex',
				borderBottomWidth: 1,
				borderBottomStyle: 'solid',
				borderBottomColor: theme.dividerColor,
			},
			barButtons: {
				display: 'flex',
				flexDirection: 'row',
			},
		};

		output.buttonIconSelected = Object.assign({}, output.buttonIcon, {
			color: theme.highlightedColor,
		});

		output.buttonLabelSelected = Object.assign({}, output.buttonLabel, {
			color: theme.color,
		});

		return output;
	}
);

module.exports = style;
