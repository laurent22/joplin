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
	isLegacyEditor: boolean;
}

const onRichTextDismissLinkClick = () => {
	Setting.setValue('richTextBannerDismissed', true);
};

const onRichTextReadMoreLinkClick = () => {
	void bridge().openExternal('https://joplinapp.org/help/apps/rich_text_editor');
};

const codeMirror6IncompatiblePluginIds = [
	// cSpell:disable
	'com.septemberhx.Joplin.Enhancement',
	'ylc395.noteLinkSystem',
	'outline',
	'joplin.plugin.cmoptions',
	'com.asdibiase.joplin-languagetool',
	// cSpell:enable
];

const codeMirror5IncompatiblePluginIds = [
	// cSpell:disable
	'nz.magnusso.zotero-link',
	// cSpell:enable
];

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

	const onSwitchEditor = () => {
		Setting.setValue('editor.legacyMarkdown', !props.isLegacyEditor);
	};

	const onDismissEditorPrompt = () => {
		const pluginIds = [...props.pluginCompatibilityBannerDismissedFor, ...incompatiblePluginIds];
		Setting.setValue('editor.pluginCompatibilityBannerDismissedFor', pluginIds);
	};

	const incompatiblePluginIds = useMemo(() => {
		const runningPluginIds = Object.keys(props.plugins);

		return runningPluginIds.map((id): string|string[] => {
			if (props.pluginCompatibilityBannerDismissedFor.includes(id)) return [];

			if (props.bodyEditor === 'CodeMirror6') {
				if (codeMirror6IncompatiblePluginIds.includes(id)) return id;
				else return [];
			} else {
				if (codeMirror5IncompatiblePluginIds.includes(id)) return id;
				else return [];
			}

		}).flat();
	}, [props.bodyEditor, props.plugins, props.pluginCompatibilityBannerDismissedFor]);

	const incompatiblePluginNames = useMemo(() => {
		if (!incompatiblePluginIds || !incompatiblePluginIds.length) return [];

		return incompatiblePluginIds.map(id => PluginService.instance().pluginById(id).manifest.name);
	}, [incompatiblePluginIds]);

	const markdownPluginBanner = (
		<BannerContent
			acceptMessage={props.isLegacyEditor ? _('Switch to the new editor') : _('Switch to the legacy editor')}
			onAccept={onSwitchEditor}
			onDismiss={onDismissEditorPrompt}
			visible={incompatiblePluginNames.length > 0 && props.bodyEditor !== 'TinyMCE'}
		>
			{_('The following plugins may not support the current markdown editor:')}
			<ul>
				{incompatiblePluginNames.map((name, index) => <li key={index}>{name}</li>)}
			</ul>
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
		pluginCompatibilityBannerDismissedFor: state.settings['editor.pluginCompatibilityBannerDismissedFor'] ?? [],
		plugins: state.pluginService.plugins,
		isLegacyEditor: state.settings['editor.legacyMarkdown'],
	};
})(WarningBanner);
