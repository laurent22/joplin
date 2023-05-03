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
		execute: async (context: CommandContext, selectedLanguages: string[] = null, useSpellChecker: boolean = null) => {
			selectedLanguages = selectedLanguages === null ? context.state.settings['spellChecker.languages'] : selectedLanguages;
			useSpellChecker = useSpellChecker === null ? context.state.settings['spellChecker.enabled'] : useSpellChecker;

			const menuItems = SpellCheckerService.instance().spellCheckerConfigMenuItems(selectedLanguages, useSpellChecker);
			const menu = Menu.buildFromTemplate(menuItems as any);
			menu.popup({ window: bridge().window() });
		},

		mapStateToTitle(state: AppState): string {
			if (!state.settings['spellChecker.enabled']) return null;
			const languages = state.settings['spellChecker.languages'];
			if (languages.length === 0) return null;
			const s: string[] = [];
			languages.forEach((language: string) => {
				s.push(language.split('-')[0]);
			});
			return s.join(', ');
		},
	};
};
