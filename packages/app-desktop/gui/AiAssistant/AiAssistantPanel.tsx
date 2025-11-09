import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { AiService } from '@joplin/lib/services/ai';
import styled from 'styled-components';
import { _ } from '@joplin/lib/locale';

const Container = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 16px;
	background-color: ${props => props.theme.backgroundColor};
	color: ${props => props.theme.color};
`;

const Header = styled.div`
	font-size: 18px;
	font-weight: bold;
	margin-bottom: 16px;
	padding-bottom: 8px;
	border-bottom: 1px solid ${props => props.theme.dividerColor};
`;

const Section = styled.div`
	margin-bottom: 16px;
`;

const SectionTitle = styled.div`
	font-size: 14px;
	font-weight: 600;
	margin-bottom: 8px;
	color: ${props => props.theme.colorFaded};
`;

const Button = styled.button`
	padding: 8px 12px;
	margin: 4px 0;
	width: 100%;
	background-color: ${props => props.theme.backgroundColor3};
	color: ${props => props.theme.color};
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 4px;
	cursor: pointer;
	font-size: 13px;
	text-align: left;
	transition: all 0.2s;

	&:hover {
		background-color: ${props => props.theme.backgroundColorHover3};
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	i {
		margin-right: 8px;
		width: 16px;
		display: inline-block;
	}
`;

const ChatContainer = styled.div`
	flex: 1;
	display: flex;
	flex-direction: column;
	margin-top: 16px;
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 4px;
	overflow: hidden;
`;

const ChatMessages = styled.div`
	flex: 1;
	overflow-y: auto;
	padding: 12px;
	background-color: ${props => props.theme.backgroundColor};
`;

const Message = styled.div<{ isUser: boolean }>`
	padding: 8px 12px;
	margin-bottom: 8px;
	border-radius: 8px;
	background-color: ${props => props.isUser ? props.theme.backgroundColor4 : props.theme.backgroundColor3};
	max-width: 85%;
	margin-left: ${props => props.isUser ? 'auto' : '0'};
	margin-right: ${props => props.isUser ? '0' : 'auto'};
	word-wrap: break-word;
`;

const InputContainer = styled.div`
	display: flex;
	padding: 12px;
	border-top: 1px solid ${props => props.theme.dividerColor};
	background-color: ${props => props.theme.backgroundColor};
`;

const Input = styled.input`
	flex: 1;
	padding: 8px 12px;
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 4px;
	background-color: ${props => props.theme.backgroundColor};
	color: ${props => props.theme.color};
	font-size: 13px;

	&:focus {
		outline: none;
		border-color: ${props => props.theme.color};
	}
`;

const SendButton = styled.button`
	margin-left: 8px;
	padding: 8px 16px;
	background-color: ${props => props.theme.backgroundColor4};
	color: ${props => props.theme.color};
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 4px;
	cursor: pointer;
	font-size: 13px;

	&:hover {
		background-color: ${props => props.theme.backgroundColorHover3};
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
`;

const StatusText = styled.div`
	font-size: 12px;
	color: ${props => props.theme.colorFaded};
	padding: 8px;
	text-align: center;
	font-style: italic;
`;

const LoadingIndicator = styled.div`
	text-align: center;
	padding: 12px;
	color: ${props => props.theme.colorFaded};
`;

interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
}

interface Props {
	noteId: string;
	selectedText: string;
	noteBody: string;
	onInsertText: (text: string) => void;
	onReplaceSelection: (text: string) => void;
}

const AiAssistantPanel: React.FC<Props> = ({ noteId: _noteId, selectedText, noteBody, onInsertText, onReplaceSelection }) => {
	const [aiService] = useState(() => AiService.instance());
	const [isEnabled, setIsEnabled] = useState(false);
	const [hasApiKey, setHasApiKey] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		const checkAiStatus = () => {
			setIsEnabled(aiService.isEnabled());
			setHasApiKey(aiService.hasApiKey());
		};

		checkAiStatus();
		const intervalId = setInterval(checkAiStatus, 2000);
		return () => clearInterval(intervalId);
	}, [aiService]);

	const handleCommand = useCallback(async (commandFn: () => Promise<string>, actionType: 'replace' | 'insert' = 'replace') => {
		if (!isEnabled || !hasApiKey) return;

		setIsProcessing(true);
		try {
			const result = await commandFn();

			if (actionType === 'replace' && selectedText) {
				onReplaceSelection(result);
			} else {
				onInsertText(result);
			}

			// Also add to chat
			setMessages(prev => [...prev, {
				id: Date.now().toString(),
				role: 'assistant',
				content: result,
			}]);
		} catch (error) {
			alert(`AI Error: ${error.message}`);
		} finally {
			setIsProcessing(false);
		}
	}, [isEnabled, hasApiKey, selectedText, onInsertText, onReplaceSelection]);

	const handleSendMessage = useCallback(async () => {
		if (!inputValue.trim() || !isEnabled || !hasApiKey || isProcessing) return;

		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			role: 'user',
			content: inputValue,
		};

		setMessages(prev => [...prev, userMessage]);
		setInputValue('');
		setIsProcessing(true);

		try {
			const response = await aiService.answerQuestion(userMessage.content, noteBody);
			const assistantMessage: ChatMessage = {
				id: (Date.now() + 1).toString(),
				role: 'assistant',
				content: response,
			};
			setMessages(prev => [...prev, assistantMessage]);
		} catch (error) {
			alert(`AI Error: ${error.message}`);
		} finally {
			setIsProcessing(false);
		}
	}, [inputValue, isEnabled, hasApiKey, isProcessing, noteBody, aiService]);

	if (!isEnabled) {
		return (
			<Container>
				<Header>{_('AI Assistant')}</Header>
				<StatusText>{_('AI features are disabled. Enable them in Settings > AI.')}</StatusText>
			</Container>
		);
	}

	if (!hasApiKey) {
		return (
			<Container>
				<Header>{_('AI Assistant')}</Header>
				<StatusText>{_('Please configure your OpenRouter API key in Settings > AI.')}</StatusText>
			</Container>
		);
	}

	return (
		<Container>
			<Header>{_('AI Assistant')}</Header>

			<Section>
				<SectionTitle>{_('Quick Actions')}</SectionTitle>

				<Button
					onClick={() => handleCommand(() => aiService.summarize(selectedText || noteBody), 'insert')}
					disabled={isProcessing || !noteBody}
				>
					<i className="fas fa-compress-alt"></i>
					{_('Summarize')}
				</Button>

				<Button
					onClick={() => handleCommand(() => aiService.improveWriting(selectedText), 'replace')}
					disabled={isProcessing || !selectedText}
				>
					<i className="fas fa-magic"></i>
					{_('Improve Writing')}
				</Button>

				<Button
					onClick={() => handleCommand(() => aiService.fixGrammar(selectedText), 'replace')}
					disabled={isProcessing || !selectedText}
				>
					<i className="fas fa-spell-check"></i>
					{_('Fix Grammar')}
				</Button>

				<Button
					onClick={() => handleCommand(() => aiService.expandText(selectedText), 'replace')}
					disabled={isProcessing || !selectedText}
				>
					<i className="fas fa-expand-alt"></i>
					{_('Expand Text')}
				</Button>

				<Button
					onClick={() => handleCommand(() => aiService.makeShorter(selectedText), 'replace')}
					disabled={isProcessing || !selectedText}
				>
					<i className="fas fa-compress"></i>
					{_('Make Shorter')}
				</Button>

				<Button
					onClick={() => handleCommand(() => aiService.continueWriting(noteBody), 'insert')}
					disabled={isProcessing || !noteBody}
				>
					<i className="fas fa-forward"></i>
					{_('Continue Writing')}
				</Button>
			</Section>

			<Section>
				<SectionTitle>{_('Chat with AI')}</SectionTitle>
				<ChatContainer>
					<ChatMessages>
						{messages.length === 0 && (
							<StatusText>{_('Ask me anything about your note!')}</StatusText>
						)}
						{messages.map(msg => (
							<Message key={msg.id} isUser={msg.role === 'user'}>
								{msg.content}
							</Message>
						))}
						{isProcessing && (
							<LoadingIndicator>
								<i className="fas fa-spinner fa-spin"></i> {_('Thinking...')}
							</LoadingIndicator>
						)}
					</ChatMessages>
					<InputContainer>
						<Input
							type="text"
							value={inputValue}
							onChange={e => setInputValue(e.target.value)}
							onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
							placeholder={_('Ask a question...')}
							disabled={isProcessing}
						/>
						<SendButton onClick={handleSendMessage} disabled={isProcessing || !inputValue.trim()}>
							{_('Send')}
						</SendButton>
					</InputContainer>
				</ChatContainer>
			</Section>
		</Container>
	);
};

export default AiAssistantPanel;
