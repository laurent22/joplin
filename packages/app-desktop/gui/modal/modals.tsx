import * as React from 'react';
import { useState } from 'react';
import createModal, { RenderFunctionProps } from './createModal';
import { RootStyle, StyledActionArea, StyledButonStrip, StyledButton, StyledCloseButton, StyledContentArea, StyledHeader, StyledInput, StyledPage } from './styles';

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
					<StyledInput autoFocus type={type} value={input} onChange={(e: any) => setInput(e.target.value)} />
				</StyledContentArea>
				<StyledActionArea>
					<StyledButonStrip>
						<StyledButton id='modal-ok' tabIndex={0} onClick ={() =>onSubmit(input)}>{ok || 'OK'}</StyledButton>
						<StyledButton tabIndex={1} onClick ={() =>onDismiss()}>{cancel || 'Cancel'}</StyledButton>
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
						<StyledButton id='modal-ok' autoFocus tabIndex={0} onClick ={() =>onSubmit(true)}>{ok || 'OK'}</StyledButton>
						<StyledButton tabIndex={1} onClick ={() =>onDismiss()}>{cancel || 'Cancel'}</StyledButton>
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
						<StyledButton id='modal-ok' autoFocus tabIndex={0} onClick ={() =>onSubmit(true)}>{ok || 'OK'}</StyledButton>
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
	confirm: async (title: string,message: string, options?: ModalOptions) => {
		return await createModal((props) => (<ConfirmModal {...props} title={title} message={message} options={options} />));
	},
	alert: async (title: string,message: string, options?: ModalOptions) => {
		return await createModal((props) => (<AlertModal {...props} title={title} message={message} options={options} />));
	},
};


export default modals;


