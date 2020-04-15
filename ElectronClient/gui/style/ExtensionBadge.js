const { createSelector } = require('reselect');
const { themeStyle } = require('../../theme.js');

const themeSelector = (state, props) => themeStyle(props.theme);

const style = createSelector(
	themeSelector,
	(theme) => {
		const output = {
			root: {
				width: 220,
				height: 60,
				borderRadius: 4,
				border: '1px solid',
				borderColor: theme.dividerColor,
				backgroundColor: theme.backgroundColor,
				paddingLeft: 14,
				paddingRight: 14,
				paddingTop: 8,
				paddingBottom: 8,
				boxSizing: 'border-box',
				display: 'flex',
				flexDirection: 'row',
				boxShadow: '0px 1px 1px rgba(0,0,0,0.3)',
			},
			logo: {
				width: 42,
				height: 42,
			},
			labelGroup: {
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				marginLeft: 14,
				fontFamily: theme.fontFamily,
				color: theme.color,
				fontSize: theme.fontSize,
			},
			locationLabel: {
				fontSize: theme.fontSize * 1.2,
				fontWeight: 'bold',
			},
		};

		return output;
	}
);

module.exports = style;
