import { CommandRuntime, CommandDeclaration, CommandContext } from '../CommandService';
import AiService from './AiService';
import { _ } from '../../locale';

export enum AiCommandNames {
	aiSummarize = 'aiSummarize',
	aiImproveWriting = 'aiImproveWriting',
	aiFixGrammar = 'aiFixGrammar',
	aiTranslate = 'aiTranslate',
	aiExpandText = 'aiExpandText',
	aiMakeShorter = 'aiMakeShorter',
	aiContinueWriting = 'aiContinueWriting',
	aiGenerateTags = 'aiGenerateTags',
	aiAskQuestion = 'aiAskQuestion',
	aiCustomPrompt = 'aiCustomPrompt',
}

const aiService = AiService.instance();

export const aiCommands: CommandDeclaration[] = [
	{
		name: AiCommandNames.aiSummarize,
		label: () => _('AI: Summarize'),
		iconName: 'fas fa-compress-alt',
	},
	{
		name: AiCommandNames.aiImproveWriting,
		label: () => _('AI: Improve writing'),
		iconName: 'fas fa-magic',
	},
	{
		name: AiCommandNames.aiFixGrammar,
		label: () => _('AI: Fix grammar'),
		iconName: 'fas fa-spell-check',
	},
	{
		name: AiCommandNames.aiTranslate,
		label: () => _('AI: Translate'),
		iconName: 'fas fa-language',
	},
	{
		name: AiCommandNames.aiExpandText,
		label: () => _('AI: Expand text'),
		iconName: 'fas fa-expand-alt',
	},
	{
		name: AiCommandNames.aiMakeShorter,
		label: () => _('AI: Make shorter'),
		iconName: 'fas fa-compress',
	},
	{
		name: AiCommandNames.aiContinueWriting,
		label: () => _('AI: Continue writing'),
		iconName: 'fas fa-forward',
	},
	{
		name: AiCommandNames.aiGenerateTags,
		label: () => _('AI: Generate tags'),
		iconName: 'fas fa-tags',
	},
	{
		name: AiCommandNames.aiAskQuestion,
		label: () => _('AI: Ask question about note'),
		iconName: 'fas fa-question-circle',
	},
	{
		name: AiCommandNames.aiCustomPrompt,
		label: () => _('AI: Custom instruction'),
		iconName: 'fas fa-terminal',
	},
];

export const aiCommandRuntime = (noteId: string, selectedText: string, noteBody: string): Record<string, CommandRuntime> => {
	return {
		[AiCommandNames.aiSummarize]: {
			execute: async (_context: CommandContext, text: string = null) => {
				const content = text || selectedText || noteBody;
				if (!content) throw new Error('No text to summarize');
				return aiService.summarize(content);
			},
		},
		[AiCommandNames.aiImproveWriting]: {
			execute: async (_context: CommandContext, text: string = null) => {
				const content = text || selectedText;
				if (!content) throw new Error('Please select text to improve');
				return aiService.improveWriting(content);
			},
		},
		[AiCommandNames.aiFixGrammar]: {
			execute: async (_context: CommandContext, text: string = null) => {
				const content = text || selectedText;
				if (!content) throw new Error('Please select text to fix');
				return aiService.fixGrammar(content);
			},
		},
		[AiCommandNames.aiTranslate]: {
			execute: async (_context: CommandContext, targetLanguage: string) => {
				const content = selectedText;
				if (!content) throw new Error('Please select text to translate');
				if (!targetLanguage) throw new Error('Target language not specified');
				return aiService.translate(content, targetLanguage);
			},
		},
		[AiCommandNames.aiExpandText]: {
			execute: async (_context: CommandContext, text: string = null) => {
				const content = text || selectedText;
				if (!content) throw new Error('Please select text to expand');
				return aiService.expandText(content);
			},
		},
		[AiCommandNames.aiMakeShorter]: {
			execute: async (_context: CommandContext, text: string = null) => {
				const content = text || selectedText;
				if (!content) throw new Error('Please select text to shorten');
				return aiService.makeShorter(content);
			},
		},
		[AiCommandNames.aiContinueWriting]: {
			execute: async (_context: CommandContext, text: string = null) => {
				const content = text || noteBody;
				if (!content) throw new Error('No text to continue from');
				return aiService.continueWriting(content);
			},
		},
		[AiCommandNames.aiGenerateTags]: {
			execute: async (_context: CommandContext, maxTags: number = 5) => {
				const content = noteBody;
				if (!content) throw new Error('Note is empty');
				return aiService.generateTags(content, maxTags);
			},
		},
		[AiCommandNames.aiAskQuestion]: {
			execute: async (_context: CommandContext, question: string) => {
				if (!question) throw new Error('Please provide a question');
				const context = noteBody;
				if (!context) throw new Error('Note is empty');
				return aiService.answerQuestion(question, context);
			},
		},
		[AiCommandNames.aiCustomPrompt]: {
			execute: async (_context: CommandContext, instruction: string) => {
				if (!instruction) throw new Error('Please provide an instruction');
				const content = selectedText || noteBody;
				if (!content) throw new Error('No text to process');
				return aiService.customPrompt(content, instruction);
			},
		},
	};
};
