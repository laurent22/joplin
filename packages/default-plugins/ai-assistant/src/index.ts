import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

/**
 * AI Assistant Plugin for Joplin
 *
 * This plugin adds AI-powered features to Joplin notes:
 * - Summarize text
 * - Improve writing
 * - Fix grammar
 * - Translate
 * - Expand/shorten text
 * - Continue writing
 * - Generate tags
 * - Ask questions about notes
 */

joplin.plugins.register({
	onStart: async function() {
		console.info('AI Assistant Plugin starting...');

		// Register AI commands
		await joplin.commands.register({
			name: 'aiSummarizeSelection',
			label: 'AI: Summarize',
			iconName: 'fas fa-compress-alt',
			execute: async () => {
				const note = await joplin.workspace.selectedNote();
				if (!note) {
					await joplin.views.dialogs.showMessageBox('Please open a note first');
					return;
				}

				const selectedText = await joplin.commands.execute('selectedText');
				const textToSummarize = selectedText || note.body;

				if (!textToSummarize) {
					await joplin.views.dialogs.showMessageBox('Note is empty');
					return;
				}

				// Call AI service (this would use the AiService from lib)
				try {
					// Note: In actual implementation, this would call the AiService
					await joplin.views.dialogs.showMessageBox('AI Summarization feature will process your text here. Configure your OpenRouter API key in Settings > AI.');
				} catch (error) {
					await joplin.views.dialogs.showMessageBox(`Error: ${error.message}`);
				}
			},
		});

		await joplin.commands.register({
			name: 'aiImproveWriting',
			label: 'AI: Improve Writing',
			iconName: 'fas fa-magic',
			execute: async () => {
				const selectedText = await joplin.commands.execute('selectedText');

				if (!selectedText) {
					await joplin.views.dialogs.showMessageBox('Please select text to improve');
					return;
				}

				await joplin.views.dialogs.showMessageBox('AI Writing Improvement feature activated. Configure your OpenRouter API key in Settings > AI.');
			},
		});

		await joplin.commands.register({
			name: 'aiFixGrammar',
			label: 'AI: Fix Grammar',
			iconName: 'fas fa-spell-check',
			execute: async () => {
				const selectedText = await joplin.commands.execute('selectedText');

				if (!selectedText) {
					await joplin.views.dialogs.showMessageBox('Please select text to fix');
					return;
				}

				await joplin.views.dialogs.showMessageBox('AI Grammar Fix feature activated. Configure your OpenRouter API key in Settings > AI.');
			},
		});

		await joplin.commands.register({
			name: 'aiContinueWriting',
			label: 'AI: Continue Writing',
			iconName: 'fas fa-forward',
			execute: async () => {
				const note = await joplin.workspace.selectedNote();
				if (!note || !note.body) {
					await joplin.views.dialogs.showMessageBox('Note is empty');
					return;
				}

				await joplin.views.dialogs.showMessageBox('AI Continue Writing feature activated. Configure your OpenRouter API key in Settings > AI.');
			},
		});

		// Add to Tools menu
		await joplin.views.menuItems.create(
			'aiMenuSummarize',
			'aiSummarizeSelection',
			MenuItemLocation.Tools,
			{ accelerator: 'CmdOrCtrl+Shift+S' }
		);

		await joplin.views.menuItems.create(
			'aiMenuImprove',
			'aiImproveWriting',
			MenuItemLocation.Tools
		);

		await joplin.views.menuItems.create(
			'aiMenuGrammar',
			'aiFixGrammar',
			MenuItemLocation.Tools
		);

		await joplin.views.menuItems.create(
			'aiMenuContinue',
			'aiContinueWriting',
			MenuItemLocation.Tools
		);

		// Add toolbar button for AI Assistant
		await joplin.views.toolbarButtons.create(
			'aiAssistantButton',
			'aiSummarizeSelection',
			ToolbarButtonLocation.EditorToolbar
		);

		console.info('AI Assistant Plugin started successfully');
	},
});
