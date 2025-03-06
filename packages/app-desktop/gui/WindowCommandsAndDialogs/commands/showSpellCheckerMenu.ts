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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const menu = Menu.buildFromTemplate(menuItems as any);
			menu.popup({ window: bridge().activeWindow() });
		},

		mapStateToTitle(state: AppState): string {
			if (!state.settings['spellChecker.enabled']) return null;
			const languages = state.settings['spellChecker.languages'];
			if (languages.length === 0) return null;
			const s: string[] = [];
			// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
			languages.forEach((language: string) => {
				const onlyLanguage = language.split('-')[0];
				if (!s.includes(onlyLanguage)) { s.push(onlyLanguage); }
			});

			return s.join(', ');
		},
	};
};
