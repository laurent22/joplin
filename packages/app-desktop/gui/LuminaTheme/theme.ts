/**
 * Lumina Notes - Modern AI-First Theme System
 *
 * A beautiful gradient-based theme with AI-focused design
 */

export interface LuminaTheme {
	// Brand Colors
	primaryGradient: string;
	aiAccent: string;
	aiGlow: string;
	aiHighlight: string;

	// Base Colors
	backgroundColor: string;
	backgroundColor2: string;
	backgroundColor3: string;
	backgroundColor4: string;
	backgroundColorHover3: string;

	// Text Colors
	color: string;
	colorFaded: string;
	colorBright: string;
	colorError: string;
	colorWarn: string;
	colorSuccess: string;

	// UI Elements
	dividerColor: string;
	borderColor: string;
	shadowColor: string;

	// Editor
	editorBackground: string;
	editorText: string;
	editorSelection: string;
	editorLineHighlight: string;

	// Sidebar
	sidebarBackground: string;
	sidebarText: string;
	sidebarHover: string;
	sidebarActive: string;

	// AI Components
	aiPanelBackground: string;
	aiChatBubbleUser: string;
	aiChatBubbleAssistant: string;
	aiButtonBackground: string;
	aiButtonHover: string;

	// Misc
	scrollbarThumb: string;
	scrollbarTrack: string;
	tooltipBackground: string;
	tooltipText: string;
}

// Lumina Dark Theme (Default)
export const luminaDarkTheme: LuminaTheme = {
	// Brand Colors
	primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	aiAccent: '#7c3aed',
	aiGlow: '#a78bfa',
	aiHighlight: '#c4b5fd',

	// Base Colors
	backgroundColor: '#0f0f23',
	backgroundColor2: '#1a1a2e',
	backgroundColor3: '#16213e',
	backgroundColor4: '#0f3460',
	backgroundColorHover3: '#1f4068',

	// Text Colors
	color: '#e5e7eb',
	colorFaded: '#9ca3af',
	colorBright: '#f9fafb',
	colorError: '#ef4444',
	colorWarn: '#f59e0b',
	colorSuccess: '#10b981',

	// UI Elements
	dividerColor: '#374151',
	borderColor: '#4b5563',
	shadowColor: 'rgba(0, 0, 0, 0.5)',

	// Editor
	editorBackground: '#1a1a2e',
	editorText: '#e5e7eb',
	editorSelection: 'rgba(124, 58, 237, 0.3)',
	editorLineHighlight: 'rgba(124, 58, 237, 0.1)',

	// Sidebar
	sidebarBackground: '#0f0f23',
	sidebarText: '#d1d5db',
	sidebarHover: '#16213e',
	sidebarActive: '#0f3460',

	// AI Components
	aiPanelBackground: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
	aiChatBubbleUser: '#7c3aed',
	aiChatBubbleAssistant: '#16213e',
	aiButtonBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	aiButtonHover: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',

	// Misc
	scrollbarThumb: '#4b5563',
	scrollbarTrack: '#1f2937',
	tooltipBackground: '#374151',
	tooltipText: '#f9fafb',
};

// Lumina Light Theme
export const luminaLightTheme: LuminaTheme = {
	// Brand Colors
	primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	aiAccent: '#7c3aed',
	aiGlow: '#a78bfa',
	aiHighlight: '#c4b5fd',

	// Base Colors
	backgroundColor: '#ffffff',
	backgroundColor2: '#f9fafb',
	backgroundColor3: '#f3f4f6',
	backgroundColor4: '#e5e7eb',
	backgroundColorHover3: '#d1d5db',

	// Text Colors
	color: '#1f2937',
	colorFaded: '#6b7280',
	colorBright: '#111827',
	colorError: '#dc2626',
	colorWarn: '#d97706',
	colorSuccess: '#059669',

	// UI Elements
	dividerColor: '#e5e7eb',
	borderColor: '#d1d5db',
	shadowColor: 'rgba(0, 0, 0, 0.1)',

	// Editor
	editorBackground: '#ffffff',
	editorText: '#1f2937',
	editorSelection: 'rgba(124, 58, 237, 0.2)',
	editorLineHighlight: 'rgba(124, 58, 237, 0.05)',

	// Sidebar
	sidebarBackground: '#f9fafb',
	sidebarText: '#374151',
	sidebarHover: '#f3f4f6',
	sidebarActive: '#e5e7eb',

	// AI Components
	aiPanelBackground: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
	aiChatBubbleUser: '#7c3aed',
	aiChatBubbleAssistant: '#f3f4f6',
	aiButtonBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	aiButtonHover: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',

	// Misc
	scrollbarThumb: '#d1d5db',
	scrollbarTrack: '#f3f4f6',
	tooltipBackground: '#1f2937',
	tooltipText: '#f9fafb',
};

// Lumina Purple Theme (AI-Focus)
export const luminaPurpleTheme: LuminaTheme = {
	// Brand Colors
	primaryGradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
	aiAccent: '#a855f7',
	aiGlow: '#c084fc',
	aiHighlight: '#e9d5ff',

	// Base Colors
	backgroundColor: '#1e1b4b',
	backgroundColor2: '#312e81',
	backgroundColor3: '#3730a3',
	backgroundColor4: '#4c1d95',
	backgroundColorHover3: '#5b21b6',

	// Text Colors
	color: '#f3e8ff',
	colorFaded: '#c4b5fd',
	colorBright: '#faf5ff',
	colorError: '#f87171',
	colorWarn: '#fbbf24',
	colorSuccess: '#34d399',

	// UI Elements
	dividerColor: '#4c1d95',
	borderColor: '#6d28d9',
	shadowColor: 'rgba(124, 58, 237, 0.5)',

	// Editor
	editorBackground: '#312e81',
	editorText: '#f3e8ff',
	editorSelection: 'rgba(168, 85, 247, 0.3)',
	editorLineHighlight: 'rgba(168, 85, 247, 0.15)',

	// Sidebar
	sidebarBackground: '#1e1b4b',
	sidebarText: '#e9d5ff',
	sidebarHover: '#3730a3',
	sidebarActive: '#4c1d95',

	// AI Components
	aiPanelBackground: 'linear-gradient(180deg, #312e81 0%, #3730a3 100%)',
	aiChatBubbleUser: '#a855f7',
	aiChatBubbleAssistant: '#3730a3',
	aiButtonBackground: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
	aiButtonHover: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',

	// Misc
	scrollbarThumb: '#6d28d9',
	scrollbarTrack: '#3730a3',
	tooltipBackground: '#4c1d95',
	tooltipText: '#faf5ff',
};

// Theme Registry
export const luminaThemes = {
	dark: luminaDarkTheme,
	light: luminaLightTheme,
	purple: luminaPurpleTheme,
} as const;

export type ThemeName = keyof typeof luminaThemes;

// Get theme by name
export const getLuminaTheme = (name: ThemeName = 'dark'): LuminaTheme => {
	return luminaThemes[name] || luminaThemes.dark;
};

// Global CSS Variables Generator
export const generateCSSVariables = (theme: LuminaTheme): string => {
	return `
		:root {
			/* Brand */
			--lumina-primary-gradient: ${theme.primaryGradient};
			--lumina-ai-accent: ${theme.aiAccent};
			--lumina-ai-glow: ${theme.aiGlow};
			--lumina-ai-highlight: ${theme.aiHighlight};

			/* Backgrounds */
			--lumina-bg: ${theme.backgroundColor};
			--lumina-bg-2: ${theme.backgroundColor2};
			--lumina-bg-3: ${theme.backgroundColor3};
			--lumina-bg-4: ${theme.backgroundColor4};
			--lumina-bg-hover: ${theme.backgroundColorHover3};

			/* Text */
			--lumina-text: ${theme.color};
			--lumina-text-faded: ${theme.colorFaded};
			--lumina-text-bright: ${theme.colorBright};
			--lumina-text-error: ${theme.colorError};
			--lumina-text-warn: ${theme.colorWarn};
			--lumina-text-success: ${theme.colorSuccess};

			/* UI Elements */
			--lumina-divider: ${theme.dividerColor};
			--lumina-border: ${theme.borderColor};
			--lumina-shadow: ${theme.shadowColor};

			/* Editor */
			--lumina-editor-bg: ${theme.editorBackground};
			--lumina-editor-text: ${theme.editorText};
			--lumina-editor-selection: ${theme.editorSelection};
			--lumina-editor-line-highlight: ${theme.editorLineHighlight};

			/* Sidebar */
			--lumina-sidebar-bg: ${theme.sidebarBackground};
			--lumina-sidebar-text: ${theme.sidebarText};
			--lumina-sidebar-hover: ${theme.sidebarHover};
			--lumina-sidebar-active: ${theme.sidebarActive};

			/* AI Components */
			--lumina-ai-panel-bg: ${theme.aiPanelBackground};
			--lumina-ai-chat-user: ${theme.aiChatBubbleUser};
			--lumina-ai-chat-assistant: ${theme.aiChatBubbleAssistant};
			--lumina-ai-button-bg: ${theme.aiButtonBackground};
			--lumina-ai-button-hover: ${theme.aiButtonHover};

			/* Misc */
			--lumina-scrollbar-thumb: ${theme.scrollbarThumb};
			--lumina-scrollbar-track: ${theme.scrollbarTrack};
			--lumina-tooltip-bg: ${theme.tooltipBackground};
			--lumina-tooltip-text: ${theme.tooltipText};
		}

		/* Smooth transitions */
		* {
			transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
		}

		/* Custom Scrollbar */
		::-webkit-scrollbar {
			width: 8px;
			height: 8px;
		}

		::-webkit-scrollbar-track {
			background: var(--lumina-scrollbar-track);
		}

		::-webkit-scrollbar-thumb {
			background: var(--lumina-scrollbar-thumb);
			border-radius: 4px;
		}

		::-webkit-scrollbar-thumb:hover {
			background: var(--lumina-ai-accent);
		}

		/* Selection */
		::selection {
			background: var(--lumina-editor-selection);
			color: var(--lumina-text-bright);
		}
	`;
};
