import CommandService from '../../../../services/CommandService';

const onRichTextReadMoreLinkClick = () => {
	void CommandService.instance().execute('openItem', 'https://joplinapp.org/help/apps/rich_text_editor');
};

export default onRichTextReadMoreLinkClick;
