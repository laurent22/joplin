import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { _ } from '@joplin/lib/locale';
import { AiService } from '@joplin/lib/services/ai';

const Overlay = styled.div<{ visible: boolean }>`
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.7);
	backdrop-filter: blur(8px);
	display: ${props => props.visible ? 'flex' : 'none'};
	align-items: flex-start;
	justify-content: center;
	padding-top: 15vh;
	z-index: 10000;
	animation: fadeIn 0.2s ease;

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
`;

const PaletteContainer = styled.div`
	width: 600px;
	max-width: 90vw;
	background: ${props => props.theme.backgroundColor2};
	border: 1px solid ${props => props.theme.aiAccent};
	border-radius: 12px;
	box-shadow: 0 20px 60px ${props => props.theme.shadowColor},
	            0 0 0 1px ${props => props.theme.aiGlow};
	overflow: hidden;
	animation: slideDown 0.2s ease;

	@keyframes slideDown {
		from {
			transform: translateY(-20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
`;

const SearchBox = styled.div`
	padding: 16px;
	background: ${props => props.theme.aiPanelBackground};
	border-bottom: 1px solid ${props => props.theme.dividerColor};
`;

const SearchInput = styled.input`
	width: 100%;
	padding: 12px 16px;
	background: ${props => props.theme.backgroundColor3};
	color: ${props => props.theme.color};
	border: 2px solid transparent;
	border-radius: 8px;
	font-size: 16px;
	outline: none;

	&:focus {
		border-color: ${props => props.theme.aiAccent};
		box-shadow: 0 0 0 3px ${props => props.theme.aiGlow}33;
	}

	&::placeholder {
		color: ${props => props.theme.colorFaded};
	}
`;

const ResultsList = styled.div`
	max-height: 400px;
	overflow-y: auto;
	padding: 8px;
`;

const ResultItem = styled.div<{ selected: boolean; category?: string }>`
	padding: 12px 16px;
	margin: 4px 0;
	background: ${props => {
		if (props.selected) return props.theme.aiButtonBackground;
		if (props.category === 'ai') return props.theme.aiChatBubbleAssistant;
		return props.theme.backgroundColor3;
	}};
	color: ${props => props.selected ? props.theme.colorBright : props.theme.color};
	border-radius: 8px;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 12px;
	transition: all 0.15s ease;

	&:hover {
		background: ${props => props.theme.aiButtonHover};
		color: ${props => props.theme.colorBright};
		transform: translateX(4px);
	}

	i {
		width: 20px;
		color: ${props => props.category === 'ai' ? props.theme.aiGlow : props.theme.colorFaded};
	}
`;

const ItemLabel = styled.div`
	flex: 1;
	font-size: 14px;
	font-weight: 500;
`;

const ItemDescription = styled.div`
	font-size: 12px;
	color: ${props => props.theme.colorFaded};
	margin-top: 2px;
`;

const CategoryHeader = styled.div`
	padding: 8px 16px;
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: ${props => props.theme.aiAccent};
	background: ${props => props.theme.backgroundColor};
	margin: 8px 0 4px 0;
	border-radius: 4px;
`;

const EmptyState = styled.div`
	padding: 32px;
	text-align: center;
	color: ${props => props.theme.colorFaded};
	font-size: 14px;
`;

interface Command {
	id: string;
	label: string;
	description?: string;
	icon: string;
	category: 'ai' | 'note' | 'view' | 'tools';
	keywords: string[];
	action: () => void | Promise<void>;
}

interface Props {
	visible: boolean;
	onClose: () => void;
	noteId?: string;
	selectedText?: string;
	noteBody?: string;
}

const LuminaCommandPalette: React.FC<Props> = ({ visible, onClose, noteId: _noteId, selectedText = '', noteBody = '' }) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const aiService = AiService.instance();

	const commands: Command[] = useMemo(() => [
		// AI Commands
		{
			id: 'ai-summarize',
			label: 'AI: Summarize',
			description: 'Generate a summary of your note or selection',
			icon: 'fas fa-compress-alt',
			category: 'ai',
			keywords: ['ai', 'summarize', 'summary', 'condense', 'tldr'],
			action: async () => {
				const text = selectedText || noteBody;
				if (text) {
					const result = await aiService.summarize(text);
					console.log('Summary:', result);
				}
			},
		},
		{
			id: 'ai-improve',
			label: 'AI: Improve Writing',
			description: 'Enhance clarity and style',
			icon: 'fas fa-magic',
			category: 'ai',
			keywords: ['ai', 'improve', 'enhance', 'better', 'writing'],
			action: async () => {
				if (selectedText) {
					const result = await aiService.improveWriting(selectedText);
					console.log('Improved:', result);
				}
			},
		},
		{
			id: 'ai-grammar',
			label: 'AI: Fix Grammar',
			description: 'Correct grammar and spelling',
			icon: 'fas fa-spell-check',
			category: 'ai',
			keywords: ['ai', 'grammar', 'spelling', 'correct', 'fix'],
			action: async () => {
				if (selectedText) {
					const result = await aiService.fixGrammar(selectedText);
					console.log('Fixed:', result);
				}
			},
		},
		{
			id: 'ai-expand',
			label: 'AI: Expand Text',
			description: 'Add more details and context',
			icon: 'fas fa-expand-alt',
			category: 'ai',
			keywords: ['ai', 'expand', 'elaborate', 'details', 'more'],
			action: async () => {
				if (selectedText) {
					const result = await aiService.expandText(selectedText);
					console.log('Expanded:', result);
				}
			},
		},
		{
			id: 'ai-shorten',
			label: 'AI: Make Shorter',
			description: 'Condense while keeping key info',
			icon: 'fas fa-compress',
			category: 'ai',
			keywords: ['ai', 'shorten', 'condense', 'brief', 'concise'],
			action: async () => {
				if (selectedText) {
					const result = await aiService.makeShorter(selectedText);
					console.log('Shortened:', result);
				}
			},
		},
		{
			id: 'ai-continue',
			label: 'AI: Continue Writing',
			description: 'Let AI continue your thoughts',
			icon: 'fas fa-forward',
			category: 'ai',
			keywords: ['ai', 'continue', 'complete', 'finish', 'write'],
			action: async () => {
				if (noteBody) {
					const result = await aiService.continueWriting(noteBody);
					console.log('Continued:', result);
				}
			},
		},
		{
			id: 'ai-translate',
			label: 'AI: Translate',
			description: 'Translate to another language',
			icon: 'fas fa-language',
			category: 'ai',
			keywords: ['ai', 'translate', 'language', 'convert'],
			action: async () => {
				// Would show language picker dialog
				console.log('Translation dialog');
			},
		},
		{
			id: 'ai-tags',
			label: 'AI: Generate Tags',
			description: 'Auto-suggest relevant tags',
			icon: 'fas fa-tags',
			category: 'ai',
			keywords: ['ai', 'tags', 'labels', 'organize'],
			action: async () => {
				if (noteBody) {
					const result = await aiService.generateTags(noteBody);
					console.log('Tags:', result);
				}
			},
		},
		{
			id: 'ai-ask',
			label: 'AI: Ask Question',
			description: 'Ask AI about your note',
			icon: 'fas fa-question-circle',
			category: 'ai',
			keywords: ['ai', 'ask', 'question', 'help', 'chat'],
			action: () => {
				// Would open AI chat panel
				console.log('Open AI chat');
			},
		},

		// Note Commands
		{
			id: 'new-note',
			label: 'New Note',
			description: 'Create a new note',
			icon: 'fas fa-file-alt',
			category: 'note',
			keywords: ['new', 'note', 'create'],
			action: () => console.log('New note'),
		},
		{
			id: 'new-todo',
			label: 'New To-Do',
			description: 'Create a new to-do item',
			icon: 'fas fa-check-square',
			category: 'note',
			keywords: ['new', 'todo', 'task', 'checkbox'],
			action: () => console.log('New todo'),
		},

		// View Commands
		{
			id: 'toggle-sidebar',
			label: 'Toggle Sidebar',
			description: 'Show/hide sidebar',
			icon: 'fas fa-bars',
			category: 'view',
			keywords: ['toggle', 'sidebar', 'hide', 'show'],
			action: () => console.log('Toggle sidebar'),
		},
		{
			id: 'toggle-ai-panel',
			label: 'Toggle AI Panel',
			description: 'Show/hide AI assistant',
			icon: 'fas fa-robot',
			category: 'view',
			keywords: ['toggle', 'ai', 'panel', 'assistant'],
			action: () => console.log('Toggle AI panel'),
		},

		// Tools
		{
			id: 'settings',
			label: 'Settings',
			description: 'Open settings',
			icon: 'fas fa-cog',
			category: 'tools',
			keywords: ['settings', 'preferences', 'config'],
			action: () => console.log('Settings'),
		},
	], [selectedText, noteBody, aiService]);

	const filteredCommands = useMemo(() => {
		if (!searchQuery) return commands;

		const query = searchQuery.toLowerCase();
		return commands.filter(cmd =>
			cmd.label.toLowerCase().includes(query) ||
			cmd.description?.toLowerCase().includes(query) ||
			cmd.keywords.some(k => k.includes(query))
		);
	}, [commands, searchQuery]);

	const groupedCommands = useMemo(() => {
		const groups: Record<string, Command[]> = {};
		filteredCommands.forEach(cmd => {
			if (!groups[cmd.category]) groups[cmd.category] = [];
			groups[cmd.category].push(cmd);
		});
		return groups;
	}, [filteredCommands]);

	const flattenedCommands = useMemo(() => {
		const result: Command[] = [];
		['ai', 'note', 'view', 'tools'].forEach(category => {
			if (groupedCommands[category]) {
				result.push(...groupedCommands[category]);
			}
		});
		return result;
	}, [groupedCommands]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setSelectedIndex(prev => Math.min(prev + 1, flattenedCommands.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setSelectedIndex(prev => Math.max(prev - 1, 0));
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const selectedCommand = flattenedCommands[selectedIndex];
			if (selectedCommand) {
				selectedCommand.action();
				onClose();
			}
		} else if (e.key === 'Escape') {
			onClose();
		}
	}, [selectedIndex, flattenedCommands, onClose]);

	useEffect(() => {
		if (visible) {
			setSearchQuery('');
			setSelectedIndex(0);
		}
	}, [visible]);

	useEffect(() => {
		setSelectedIndex(0);
	}, [searchQuery]);

	const categoryLabels = {
		ai: '✨ AI Commands',
		note: '📝 Note Commands',
		view: '👁️ View Commands',
		tools: '🔧 Tools',
	};

	return (
		<Overlay visible={visible} onClick={onClose}>
			<PaletteContainer onClick={(e) => e.stopPropagation()}>
				<SearchBox>
					<SearchInput
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="🔍 Type a command or search with AI..."
						autoFocus
					/>
				</SearchBox>

				<ResultsList>
					{flattenedCommands.length === 0 ? (
						<EmptyState>
							No commands found. Try different keywords!
						</EmptyState>
					) : (
						Object.entries(groupedCommands).map(([category, cmds]) => (
							<div key={category}>
								<CategoryHeader>{categoryLabels[category as keyof typeof categoryLabels]}</CategoryHeader>
								{cmds.map((cmd) => {
									const globalIndex = flattenedCommands.indexOf(cmd);
									return (
										<ResultItem
											key={cmd.id}
											selected={globalIndex === selectedIndex}
											category={cmd.category}
											onClick={() => {
												cmd.action();
												onClose();
											}}
										>
											<i className={cmd.icon}></i>
											<div style={{ flex: 1 }}>
												<ItemLabel>{cmd.label}</ItemLabel>
												{cmd.description && <ItemDescription>{cmd.description}</ItemDescription>}
											</div>
										</ResultItem>
									);
								})}
							</div>
						))
					)}
				</ResultsList>
			</PaletteContainer>
		</Overlay>
	);
};

export default LuminaCommandPalette;
