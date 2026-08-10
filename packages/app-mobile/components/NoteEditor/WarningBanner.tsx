import * as React from 'react';
import { connect } from 'react-redux';
import { _ } from '@joplin/lib/locale';
import onRichTextReadMoreLinkClick from '@joplin/lib/components/shared/NoteEditor/WarningBanner/onRichTextReadMoreLinkClick';
import onRichTextDismissLinkClick from '@joplin/lib/components/shared/NoteEditor/WarningBanner/onRichTextDismissLinkClick';
import { AppState } from '../../utils/types';
import { EditorType } from './types';
import { Banner } from 'react-native-paper';
import { useMemo } from 'react';
import useEditorTypeMigrationBanner from '@joplin/lib/components/shared/NoteEditor/WarningBanner/useEditorTypeMigrationBanner';
import { MarkupLanguage } from '@joplin/renderer/types';

interface Props {
	editorType: EditorType;
	richTextBannerDismissed: boolean;
	editorMigrationVersion: number;
	inEditorRendering: boolean;

	markupLanguage: MarkupLanguage;
}

const useBanner = ({
	editorType,
	richTextBannerDismissed,
	editorMigrationVersion,
	inEditorRendering,
}: Props) => {
	const editorMigrationBanner = useEditorTypeMigrationBanner({
		markdownEditorEnabled: editorType === EditorType.Markdown,
		editorMigrationVersion: editorMigrationVersion,
		inEditorRenderingEnabled: inEditorRendering,
	});

	return useMemo(() => {
		if (editorType === EditorType.RichText && !richTextBannerDismissed) {
			return {
				label: _('This Rich Text editor has a number of limitations and it is recommended to be aware of them before using it.'),
				warning: true,
				actions: [
					{
						label: _('Read more'),
						onPress: onRichTextReadMoreLinkClick,
					},
					{
						label: _('Dismiss'),
						accessibilityHint: _('Hides warning'),
						onPress: onRichTextDismissLinkClick,
					},
				],
			};
		}

		if (editorMigrationBanner.enabled) {
			return {
				label: editorMigrationBanner.label,
				actions: [
					editorMigrationBanner.keepEnabled,
					editorMigrationBanner.disable,
				],
			};
		}

		return null;
	}, [editorType, richTextBannerDismissed, editorMigrationBanner]);
};

const WarningBanner: React.FC<Props> = props => {
	const banner = useBanner(props);

	if (!banner) return null;
	return (
		<Banner
			icon={banner.warning ? 'alert-outline' : 'information-outline'}
			actions={banner.actions}
			// Avoid hiding with react-native-paper's "visible" prop to avoid potential accessibility issues
			// related to how react-native-paper hides the banner.
			visible={true}
		>
			{banner.label}
		</Banner>
	);
};

export default connect((state: AppState) => {
	return {
		richTextBannerDismissed: state.settings.richTextBannerDismissed,
		editorMigrationVersion: state.settings['editor.migration'],
	};
})(WarningBanner);
