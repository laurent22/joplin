import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../services/bridge';
import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
import { AppState } from '../../../app.reducer';

const Menu = bridge().Menu;

export const declaration: CommandDeclaration = {
	name: 'showSpellCheckerMenu',
	label: () => _('Spell checker'),
	iconName: 'fas fa-globe',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, selectedLanguage: string = null, useSpellChecker: boolean = null) => {
			selectedLanguage = selectedLanguage === null ? context.state.settings['spellChecker.language'] : selectedLanguage;
			useSpellChecker = useSpellChecker === null ? context.state.settings['spellChecker.enabled'] : useSpellChecker;

			const menuItems = SpellCheckerService.instance().spellCheckerConfigMenuItems(selectedLanguage, useSpellChecker);
			const menu = Menu.buildFromTemplate(menuItems);
			menu.popup(bridge().window());
		},

		mapStateToTitle(state: AppState): string {
			if (!state.settings['spellChecker.enabled']) return null;
			const language = state.settings['spellChecker.language'];
			if (!language) return null;
			const s = language.split('-');
			return s[0];
		},
	};
};
