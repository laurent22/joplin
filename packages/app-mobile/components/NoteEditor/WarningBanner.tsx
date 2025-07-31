import * as React from 'react';
import { connect } from 'react-redux';
import { _ } from '@joplin/lib/locale';
import onRichTextReadMoreLinkClick from '@joplin/lib/components/shared/NoteEditor/WarningBanner/onRichTextReadMoreLinkClick';
import onRichTextDismissLinkClick from '@joplin/lib/components/shared/NoteEditor/WarningBanner/onRichTextDismissLinkClick';
import { AppState } from '../../utils/types';
import { EditorType } from './types';
import { Banner } from 'react-native-paper';
import { useMemo } from 'react';

interface Props {
	editorType: EditorType;
	richTextBannerDismissed: boolean;
}

const WarningBanner: React.FC<Props> = props => {
	const actions = useMemo(() => [
		{
			label: _('Read more'),
			onPress: onRichTextReadMoreLinkClick,
		},
		{
			label: _('Dismiss'),
			accessibilityHint: _('Hides warning'),
			onPress: onRichTextDismissLinkClick,
		},
	], []);

	if (props.editorType !== EditorType.RichText || props.richTextBannerDismissed) return null;
	return (
		<Banner
			icon='alert-outline'
			actions={actions}
			// Avoid hiding with react-native-paper's "visible" prop to avoid potential accessibility issues
			// related to how react-native-paper hides the banner.
			visible={true}
		>
			{_('This Rich Text editor has a number of limitations and it is recommended to be aware of them before using it.')}
		</Banner>
	);
};

export default connect((state: AppState) => {
	return {
		richTextBannerDismissed: state.settings.richTextBannerDismissed,
	};
})(WarningBanner);
