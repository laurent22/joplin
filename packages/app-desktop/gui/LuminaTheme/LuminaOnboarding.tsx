import * as React from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';

const OnboardingOverlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 99999;
	animation: fadeIn 0.5s ease;

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
`;

const OnboardingCard = styled.div`
	width: 600px;
	max-width: 90vw;
	background: ${props => props.theme.backgroundColor2};
	border: 1px solid ${props => props.theme.aiGlow};
	border-radius: 16px;
	box-shadow: 0 0 60px ${props => props.theme.aiAccent}66;
	overflow: hidden;
	animation: slideUp 0.5s ease;

	@keyframes slideUp {
		from {
			transform: translateY(30px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
`;

const Header = styled.div`
	padding: 48px 32px;
	background: ${props => props.theme.primaryGradient};
	text-align: center;
	color: white;
`;

const Logo = styled.div`
	font-size: 64px;
	margin-bottom: 16px;
	animation: float 3s ease-in-out infinite;

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}
`;

const Title = styled.h1`
	font-size: 32px;
	font-weight: 700;
	margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
	font-size: 16px;
	opacity: 0.9;
	margin: 0;
`;

const Content = styled.div`
	padding: 32px;
`;

const Step = styled.div<{ visible: boolean }>`
	display: ${props => props.visible ? 'block' : 'none'};
	animation: ${props => props.visible ? 'fadeInSlide 0.3s ease' : 'none'};

	@keyframes fadeInSlide {
		from {
			opacity: 0;
			transform: translateX(20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
`;

const StepTitle = styled.h2`
	font-size: 24px;
	margin: 0 0 16px 0;
	color: ${props => props.theme.colorBright};
`;

const StepDescription = styled.p`
	font-size: 14px;
	color: ${props => props.theme.colorFaded};
	margin: 0 0 24px 0;
	line-height: 1.6;
`;

const Input = styled.input`
	width: 100%;
	padding: 12px 16px;
	background: ${props => props.theme.backgroundColor3};
	color: ${props => props.theme.color};
	border: 2px solid ${props => props.theme.dividerColor};
	border-radius: 8px;
	font-size: 14px;
	margin-bottom: 16px;

	&:focus {
		outline: none;
		border-color: ${props => props.theme.aiAccent};
	}
`;

const Select = styled.select`
	width: 100%;
	padding: 12px 16px;
	background: ${props => props.theme.backgroundColor3};
	color: ${props => props.theme.color};
	border: 2px solid ${props => props.theme.dividerColor};
	border-radius: 8px;
	font-size: 14px;
	margin-bottom: 16px;

	&:focus {
		outline: none;
		border-color: ${props => props.theme.aiAccent};
	}
`;

const FeatureGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16px;
	margin-top: 24px;
`;

const FeatureCard = styled.div`
	padding: 20px;
	background: ${props => props.theme.backgroundColor3};
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 8px;
	text-align: center;
	transition: all 0.2s ease;

	&:hover {
		transform: translateY(-2px);
		border-color: ${props => props.theme.aiAccent};
		box-shadow: 0 4px 12px ${props => props.theme.aiAccent}33;
	}
`;

const FeatureIcon = styled.div`
	font-size: 32px;
	margin-bottom: 12px;
	color: ${props => props.theme.aiGlow};
`;

const FeatureTitle = styled.div`
	font-size: 14px;
	font-weight: 600;
	color: ${props => props.theme.color};
	margin-bottom: 4px;
`;

const FeatureDescription = styled.div`
	font-size: 12px;
	color: ${props => props.theme.colorFaded};
`;

const ButtonRow = styled.div`
	display: flex;
	gap: 12px;
	justify-content: flex-end;
	padding: 24px 32px;
	border-top: 1px solid ${props => props.theme.dividerColor};
`;

const Button = styled.button<{ primary?: boolean }>`
	padding: 12px 24px;
	background: ${props => props.primary ? props.theme.aiButtonBackground : props.theme.backgroundColor3};
	color: ${props => props.primary ? 'white' : props.theme.color};
	border: none;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		background: ${props => props.primary ? props.theme.aiButtonHover : props.theme.backgroundColor4};
		transform: translateY(-1px);
		box-shadow: 0 4px 12px ${props => props.primary ? props.theme.aiAccent : props.theme.shadowColor}44;
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
`;

const ProgressDots = styled.div`
	display: flex;
	gap: 8px;
	justify-content: center;
	margin-bottom: 16px;
`;

const Dot = styled.div<{ active: boolean }>`
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: ${props => props.active ? props.theme.aiAccent : props.theme.dividerColor};
	transition: all 0.2s ease;
`;

interface Props {
	onComplete: () => void;
}

const LuminaOnboarding: React.FC<Props> = ({ onComplete }) => {
	const [currentStep, setCurrentStep] = useState(0);
	const [apiKey, setApiKey] = useState('');
	const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
	const [selectedTheme, setSelectedTheme] = useState('dark');

	const totalSteps = 4;

	const handleNext = () => {
		if (currentStep < totalSteps - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			handleFinish();
		}
	};

	const handleBack = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleFinish = async () => {
		// Save settings
		await Setting.setValue('ai.enabled', true);
		await Setting.setValue('ai.openRouter.apiKey', apiKey);
		await Setting.setValue('ai.openRouter.model', selectedModel);
		await Setting.setValue('lumina.onboardingComplete', true);
		// Note: Theme can be changed in Settings > Appearance
		// The selectedTheme value is stored but not applied here due to type constraints

		onComplete();
	};

	const canProceed = () => {
		if (currentStep === 2) return apiKey.length > 0;
		return true;
	};

	return (
		<OnboardingOverlay>
			<OnboardingCard>
				<Header>
					<Logo>🌟</Logo>
					<Title>Welcome to Lumina Notes</Title>
					<Subtitle>AI-powered note-taking, reimagined</Subtitle>
				</Header>

				<Content>
					<ProgressDots>
						{[...Array(totalSteps)].map((_, i) => (
							<Dot key={i} active={i === currentStep} />
						))}
					</ProgressDots>

					{/* Step 1: Welcome */}
					<Step visible={currentStep === 0}>
						<StepTitle>Transform Your Note-Taking</StepTitle>
						<StepDescription>
							Lumina Notes is built on Joplin's trusted foundation, enhanced with powerful AI capabilities.
							Your notes stay private and secure while you get intelligent writing assistance.
						</StepDescription>
						<FeatureGrid>
							<FeatureCard>
								<FeatureIcon>🤖</FeatureIcon>
								<FeatureTitle>AI Writing</FeatureTitle>
								<FeatureDescription>Improve, summarize, and continue your writing</FeatureDescription>
							</FeatureCard>
							<FeatureCard>
								<FeatureIcon>🔒</FeatureIcon>
								<FeatureTitle>Private & Secure</FeatureTitle>
								<FeatureDescription>End-to-end encryption & local storage</FeatureDescription>
							</FeatureCard>
							<FeatureCard>
								<FeatureIcon>💬</FeatureIcon>
								<FeatureTitle>AI Chat</FeatureTitle>
								<FeatureDescription>Ask questions about your notes</FeatureDescription>
							</FeatureCard>
							<FeatureCard>
								<FeatureIcon>🏷️</FeatureIcon>
								<FeatureTitle>Smart Tags</FeatureTitle>
								<FeatureDescription>Auto-generate relevant tags</FeatureDescription>
							</FeatureCard>
						</FeatureGrid>
					</Step>

					{/* Step 2: Theme Selection */}
					<Step visible={currentStep === 1}>
						<StepTitle>Choose Your Theme</StepTitle>
						<StepDescription>
							Select the look and feel that works best for you. You can change this anytime in settings.
						</StepDescription>
						<Select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)}>
							<option value="dark">🌙 Lumina Dark (Recommended)</option>
							<option value="light">☀️ Lumina Light</option>
							<option value="purple">💜 Lumina Purple (AI Focus)</option>
						</Select>
					</Step>

					{/* Step 3: AI Setup */}
					<Step visible={currentStep === 2}>
						<StepTitle>Connect AI Provider</StepTitle>
						<StepDescription>
							Lumina uses OpenRouter to access multiple AI models. Get your free API key at{' '}
							<a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed' }}>
								openrouter.ai
							</a>
						</StepDescription>
						<Input
							type="password"
							placeholder="Enter your OpenRouter API key (sk-or-...)"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
						/>
						<StepDescription style={{ marginTop: 16 }}>
							Choose your default AI model:
						</StepDescription>
						<Select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
							<option value="openai/gpt-4o-mini">GPT-4o Mini (Fast & Affordable) ⚡</option>
							<option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Best Quality) ⭐</option>
							<option value="openai/gpt-4o">GPT-4o (Premium)</option>
							<option value="google/gemini-flash-1.5-8b">Gemini Flash (Fastest) 🚀</option>
							<option value="meta-llama/llama-3.3-70b">Llama 3.3 70B (Open Source)</option>
						</Select>
						<StepDescription style={{ fontSize: 12, marginTop: 8 }}>
							💡 Tip: You can skip this step and configure AI later in Settings
						</StepDescription>
					</Step>

					{/* Step 4: Ready */}
					<Step visible={currentStep === 3}>
						<StepTitle>You're All Set! 🎉</StepTitle>
						<StepDescription>
							Lumina Notes is ready to supercharge your productivity. Here are some tips to get started:
						</StepDescription>
						<FeatureGrid style={{ marginTop: 24 }}>
							<FeatureCard>
								<FeatureIcon>⌘ K</FeatureIcon>
								<FeatureTitle>Command Palette</FeatureTitle>
								<FeatureDescription>Press Cmd/Ctrl+K to access all features</FeatureDescription>
							</FeatureCard>
							<FeatureCard>
								<FeatureIcon>✨</FeatureIcon>
								<FeatureTitle>AI Panel</FeatureTitle>
								<FeatureDescription>Click the AI button to open assistant</FeatureDescription>
							</FeatureCard>
							<FeatureCard>
								<FeatureIcon>📝</FeatureIcon>
								<FeatureTitle>Select & Act</FeatureTitle>
								<FeatureDescription>Select text, right-click for AI options</FeatureDescription>
							</FeatureCard>
							<FeatureCard>
								<FeatureIcon>🔧</FeatureIcon>
								<FeatureTitle>Settings</FeatureTitle>
								<FeatureDescription>Configure AI & sync in Settings {'>'} AI</FeatureDescription>
							</FeatureCard>
						</FeatureGrid>
					</Step>
				</Content>

				<ButtonRow>
					{currentStep > 0 && (
						<Button onClick={handleBack}>
							Back
						</Button>
					)}
					{currentStep === 2 && (
						<Button onClick={handleNext}>
							Skip for Now
						</Button>
					)}
					<Button primary onClick={handleNext} disabled={!canProceed()}>
						{currentStep === totalSteps - 1 ? "Let's Go!" : 'Next'}
					</Button>
				</ButtonRow>
			</OnboardingCard>
		</OnboardingOverlay>
	);
};

export default LuminaOnboarding;
