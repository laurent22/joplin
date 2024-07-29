import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from '../../../app.reducer';
import Setting from '@joplin/lib/models/Setting';
import BannerContent from './BannerContent';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../services/bridge';
import { useMemo } from 'react';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import PluginService from '@joplin/lib/services/plugins/PluginService';

interface Props {
	bodyEditor: string;
	richTextBannerDismissed: boolean;
	pluginCompatibilityBannerDismissedFor: string[];
	plugins: PluginStates;
}

const onRichTextDismissLinkClick = () => {
	Setting.setValue('richTextBannerDismissed', true);
};

const onRichTextReadMoreLinkClick = () => {
	void bridge().openExternal('https://joplinapp.org/help/apps/rich_text_editor');
};

const onSwitchToLegacyEditor = () => {
	Setting.setValue('editor.markdown-legacy', true);
};

const incompatiblePluginIds = [
	// cSpell:disable
	'com.septemberhx.Joplin.Enhancement',
	'ylc395.noteLinkSystem',
	'outline',
	'joplin.plugin.cmoptions',
	'plugin.calebjohn.MathMode',
	'com.ckant.joplin-plugin-better-code-blocks',
	// cSpell:enable
];

const onDismissLegacyEditorPrompt = () => {
	Setting.setValue('editor.pluginCompatibilityBannerDismissedFor', [...PluginService.instance().pluginIds]);
};

const WarningBanner: React.FC<Props> = props => {
	const wysiwygBanner = (
		<BannerContent
			acceptMessage={_('Read more about it')}
			onAccept={onRichTextReadMoreLinkClick}
			onDismiss={onRichTextDismissLinkClick}
			visible={props.bodyEditor === 'TinyMCE' && !props.richTextBannerDismissed}
		>
			{_('This Rich Text editor has a number of limitations and it is recommended to be aware of them before using it.')}
		</BannerContent>
	);

	const showMarkdownPluginBanner = useMemo(() => {
		if (props.bodyEditor === 'CodeMirror5') {
			return false;
		}

		const runningPluginIds = Object.keys(props.plugins);

		return runningPluginIds.some(id => {
			if (props.pluginCompatibilityBannerDismissedFor.includes(id)) {
				return false;
			}

			return incompatiblePluginIds.includes(id);
		});
	}, [props.bodyEditor, props.plugins, props.pluginCompatibilityBannerDismissedFor]);

	const markdownPluginBanner = (
		<BannerContent
			acceptMessage={_('Switch to the legacy editor')}
			onAccept={onSwitchToLegacyEditor}
			onDismiss={onDismissLegacyEditorPrompt}
			visible={showMarkdownPluginBanner}
		>
			{_('One or more installed plugins does not support the current markdown editor.')}
		</BannerContent>
	);

	return <>
		{wysiwygBanner}
		{markdownPluginBanner}
	</>;
};

export default connect((state: AppState) => {
	return {
		richTextBannerDismissed: state.settings.richTextBannerDismissed,
		pluginCompatibilityBannerDismissedFor: state.settings['editor.pluginCompatibilityBannerDismissedFor'],
		plugins: state.pluginService.plugins,
	};
})(WarningBanner);
