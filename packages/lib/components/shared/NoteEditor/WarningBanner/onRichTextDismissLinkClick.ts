import Setting from '../../../../models/Setting';

const onRichTextDismissLinkClick = () => {
	Setting.setValue('richTextBannerDismissed', true);
};

export default onRichTextDismissLinkClick;
