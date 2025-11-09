/**
 * Lumina Notes - Configuration File
 *
 * This file contains branding and configuration overrides
 * for the Lumina Notes fork of Joplin
 */

module.exports = {
	// Product Information
	product: {
		name: 'Lumina Notes',
		nameShort: 'Lumina',
		description: 'AI-Powered Note-Taking, Reimagined',
		version: '1.0.0',
		tagline: 'Your Intelligent Note-Taking Companion',
	},

	// Company/Organization
	company: {
		name: 'Lumina',
		url: 'https://luminanotes.app',
		email: 'hello@luminanotes.app',
	},

	// Repository
	repository: {
		url: 'https://github.com/your-org/lumina-notes',
		issuesUrl: 'https://github.com/your-org/lumina-notes/issues',
	},

	// Branding
	branding: {
		appId: 'com.luminanotes.desktop',
		productName: 'Lumina Notes',
		copyright: `Copyright © ${new Date().getFullYear()} Lumina Team`,
		logo: '🌟',
		primaryColor: '#7c3aed',
		accentColor: '#a78bfa',
	},

	// AI Configuration
	ai: {
		defaultProvider: 'openrouter',
		defaultModel: 'openai/gpt-4o-mini',
		enabledByDefault: false, // User must opt-in
		features: {
			chat: true,
			summarize: true,
			improve: true,
			translate: true,
			tags: true,
			continue: true,
		},
	},

	// Theme
	theme: {
		default: 'lumina-dark',
		available: ['lumina-dark', 'lumina-light', 'lumina-purple'],
	},

	// Features
	features: {
		commandPalette: true,
		aiAssistant: true,
		onboarding: true,
		smartTags: true,
		semanticSearch: false, // Coming soon
		collaboration: false, // Coming soon
	},

	// Analytics (optional, disabled by default)
	analytics: {
		enabled: false,
		telemetry: false,
	},

	// Links
	links: {
		website: 'https://luminanotes.app',
		docs: 'https://docs.luminanotes.app',
		community: 'https://community.luminanotes.app',
		twitter: 'https://twitter.com/luminanotes',
		github: 'https://github.com/your-org/lumina-notes',
	},

	// Onboarding
	onboarding: {
		enabled: true,
		steps: ['welcome', 'theme', 'ai-setup', 'ready'],
		skipAiSetup: true, // Allow users to skip AI configuration
	},

	// Experimental Features (Hidden by default)
	experimental: {
		voiceInput: false,
		imageGeneration: false,
		knowledgeGraph: false,
		collaboration: false,
	},
};
