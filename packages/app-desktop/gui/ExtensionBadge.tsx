import * as React from 'react';
import bridge from '../services/bridge';
import { _ } from '@joplin/lib/locale';
import { ThemeStyle, themeStyle } from '@joplin/lib/theme';
const { createSelector } = require('reselect');

interface Props {
	themeId: number;
	type: string;
	url: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	style?: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const themeSelector = (_state: any, props: any) => themeStyle(props.themeId);

const styleSelector = createSelector(
	themeSelector,
	(theme: ThemeStyle) => {
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
	},
);

function platformAssets(type: string) {
	if (type === 'firefox') {
		return {
			logoImage: `${bridge().buildDir()}/images/firefox-logo.svg`,
			locationLabel: _('Firefox Extension'),
		};
	}

	if (type === 'chrome') {
		return {
			logoImage: `${bridge().buildDir()}/images/chrome-logo.svg`,
			locationLabel: _('Chrome Web Store'),
		};
	}

	throw new Error(`Invalid type:${type}`);
}

function ExtensionBadge(props: Props) {
	const style = styleSelector(null, props);
	const assets = platformAssets(props.type);

	const onClick = () => {
		void bridge().openExternal(props.url);
	};

	const rootStyle = props.style ? { ...style.root, ...props.style } : style.root;

	return (
		<a style={rootStyle} onClick={onClick} href="#">
			<img style={style.logo} src={assets.logoImage}/>
			<div style={style.labelGroup} >
				<div>{_('Get it now:')}</div>
				<div style={style.locationLabel}>{assets.locationLabel}</div>
			</div>
		</a>
	);
}

export default ExtensionBadge;
