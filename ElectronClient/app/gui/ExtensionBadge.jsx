const React = require('react');
const { bridge } = require('electron').remote.require('./bridge');
const styleSelector = require('./style/ExtensionBadge');
const { _ } = require('lib/locale.js');

function platformAssets(type) {
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

function ExtensionBadge(props) {
	const style = styleSelector(null, props);
	const assets = platformAssets(props.type);

	const onClick = () => {
		bridge().openExternal(props.url);
	};

	const rootStyle = props.style ? Object.assign({}, style.root, props.style) : style.root;

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

module.exports = ExtensionBadge;
