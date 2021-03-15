import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import { useEffect, useState } from 'react';
import createModal, { RenderFunctionProps } from './createModal';
import { RootStyle, StyledActionArea, StyledButonStrip, StyledButton, StyledCloseButton, StyledContentArea, StyledError, StyledHeader, StyledInput, StyledInputSeparator, StyledLabel, StyledPage } from './styles';

type HTMLInputTypes = 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week';
type ModalOptions = {
  ok?: string;
  cancel?: string;
};
type PromptOptions = ModalOptions & {
  type: HTMLInputTypes;
};

type ModalProps = OtherProps & RenderFunctionProps;
type PromptModalProps = ModalProps & PromptOtherProps & RenderFunctionProps;

interface OtherProps {
	themeId?: number;
	title: string;
	message: string;
	options?: ModalOptions;
}

interface PromptOtherProps {
	defaultValue?: string;
	options?: PromptOptions;
}

const CloseIcon = () =><i className={'fas fa-times'}></i>;
const PromptModal = ({ show, onSubmit,onDismiss, title, message, options, defaultValue }: PromptModalProps) => {
	const [input, setInput] = useState(defaultValue || '');
	const { ok,cancel,type } = options;
	if (!show) return (null);
	return (
		<RootStyle>
			<StyledPage>
				<StyledCloseButton onClick={() => onDismiss()}><CloseIcon/></StyledCloseButton>
				<StyledHeader>{title}</StyledHeader>
				<StyledContentArea>
					{message}
					<StyledInputSeparator></StyledInputSeparator>
					<StyledInput autoFocus type={type} value={input} onChange={(e: any) => setInput(e.target.value)} />
				</StyledContentArea>
				<StyledActionArea>
					<StyledButonStrip>
						<StyledButton id='modal-ok' tabIndex={0} onClick ={() =>onSubmit(input)}>{ok || _('OK')}</StyledButton>
						<StyledButton tabIndex={1} onClick ={() =>onDismiss()}>{cancel || _('Cancel')}</StyledButton>
					</StyledButonStrip>
				</StyledActionArea>
			</StyledPage>
		</RootStyle>
	);
};

const PromptWithConfirmationModal = ({ show, onSubmit,onDismiss, title, message, options, defaultValue }: PromptModalProps) => {
	const [input, setInput] = useState(defaultValue || '');
	const [confirmInput, setConfirmInput] = useState(defaultValue || '');
	const [error, setError] = useState('');
	const { ok,cancel,type } = options;

	useEffect(() => {
		if (input !== confirmInput) {
			setError(_('Fields do not match'));
		} else {
			setError('');
		}
	}, [input, confirmInput]);

	if (!show) return (null);
	return (
		<RootStyle>
			<StyledPage>
				<StyledCloseButton onClick={() => onDismiss()}><CloseIcon/></StyledCloseButton>
				<StyledHeader>{title}</StyledHeader>
				<StyledContentArea>
					<p>{message}</p>
					<StyledInputSeparator></StyledInputSeparator>
					<StyledLabel>Password:</StyledLabel>
					<StyledInput autoFocus type={type} value={input} onChange={(e: any) => setInput(e.target.value)} />
					<StyledLabel>Confirm password:</StyledLabel>
					<StyledInput type={type} value={confirmInput} onChange={(e: any) => setConfirmInput(e.target.value)} />
					<StyledError>{error}</StyledError>
				</StyledContentArea>
				<StyledActionArea>
					<StyledButonStrip>
						<StyledButton disabled={error} id='modal-ok' tabIndex={0} onClick ={() =>onSubmit(input)}>{ok || _('OK')}</StyledButton>
						<StyledButton tabIndex={1} onClick ={() =>onDismiss()}>{cancel || _('Cancel')}</StyledButton>
					</StyledButonStrip>
				</StyledActionArea>
			</StyledPage>
		</RootStyle>
	);
};

const ConfirmModal = ({ show, onSubmit,onDismiss, title,message, options }: ModalProps) => {
	const { ok,cancel } = options;
	if (!show) return (null);
	return (
		<RootStyle>
			<StyledPage>
				<StyledCloseButton onClick={() => onDismiss()}><CloseIcon/></StyledCloseButton>
				<StyledHeader>{title}</StyledHeader>
				<StyledContentArea>
					{message}
				</StyledContentArea>
				<StyledActionArea>
					<StyledButonStrip>
						<StyledButton id='modal-ok' autoFocus tabIndex={0} onClick ={() =>onSubmit(true)}>{ok || _('OK')}</StyledButton>
						<StyledButton tabIndex={1} onClick ={() =>onDismiss()}>{cancel || _('Cancel')}</StyledButton>
					</StyledButonStrip>
				</StyledActionArea>
			</StyledPage>
		</RootStyle>
	);
};

const AlertModal = ({ show, onSubmit,onDismiss,title,message, options }: ModalProps) => {
	const { ok } = options;
	if (!show) return (null);
	return (
		<RootStyle>
			<StyledPage>
				<StyledCloseButton onClick={() => onDismiss()}><CloseIcon/></StyledCloseButton>
				<StyledHeader>{title}</StyledHeader>
				<StyledContentArea>
					{message}
				</StyledContentArea>
				<StyledActionArea>
					<StyledButonStrip>
						<StyledButton id='modal-ok' autoFocus tabIndex={0} onClick ={() =>onSubmit(true)}>{ok || _('OK')}</StyledButton>
					</StyledButonStrip>
				</StyledActionArea>
			</StyledPage>
		</RootStyle>
	);
};


const modals = {
	prompt: async (title: string,message: string, defaultValue?: any, options?: PromptOptions) => {
		return await createModal((props) => (<PromptModal {...props} title={title} message={message} defaultValue={defaultValue} options={options} />));
	},
	promptWithConfirmation: async (title: string,message: string, defaultValue?: any, options?: PromptOptions) => {
		return await createModal((props) => (<PromptWithConfirmationModal {...props} title={title} message={message} defaultValue={defaultValue} options={options} />));
	},
	confirm: async (title: string,message: string, options?: ModalOptions) => {
		return await createModal((props) => (<ConfirmModal {...props} title={title} message={message} options={options} />));
	},
	alert: async (title: string,message: string, options?: ModalOptions) => {
		return await createModal((props) => (<AlertModal {...props} title={title} message={message} options={options} />));
	},
};


export default modals;


