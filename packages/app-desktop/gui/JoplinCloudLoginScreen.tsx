import { CSSProperties, useEffect, useReducer, useState } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../app.reducer';
import { clipboard } from 'electron';
import Button, { ButtonLevel } from './Button/Button';
const bridge = require('@electron/remote').require('./bridge').default;
import { uuidgen } from '@joplin/lib/uuid';
import { Dispatch } from 'redux';
import { reducer, intitialValues, generateLoginWithUniqueLoginCode, checkIfLoginWasSuccessful } from '@joplin/lib/services/JoplinCloudLogin';
import Setting from '@joplin/lib/models/Setting';

const { connect } = require('react-redux');
const { themeStyle } = require('@joplin/lib/theme');

const loginUrl = `${Setting.value('sync.10.website')}/login`;
const applicationsUrl = `${Setting.value('sync.10.path')}/api/applications`;

interface Props {
	themeId: string;
	style: any;
	dispatch: Dispatch;
}

const styles: Record<string, CSSProperties> = {
	page: { display: 'flex', flexDirection: 'column', height: '100%' },
	buttonsContainer: { marginBottom: '2em', display: 'flex' },
};

const JoplinCloudScreenComponent = (props: Props) => {

	const style = props.style;
	const theme = themeStyle(props.themeId);
	const [uniqueLoginCode, setUniqueLoginCode] = useState(undefined);
	const [intervalIdentifier, setIntervalIdentifier] = useState(undefined);
	const [state, dispatch] = useReducer(reducer, intitialValues);

	const containerStyle = { ...theme.containerStyle, padding: theme.configScreenPadding,
		height: style.height - theme.margin * 2,
		flex: 1 };

	const periodicallyCheckForCredentials = () => {
		if (intervalIdentifier) return;

		const interval = setInterval(async () => {
			const response = await checkIfLoginWasSuccessful(applicationsUrl, uniqueLoginCode);
			if (response && response.success) {
				dispatch('COMPLETED');
				clearInterval(interval);
			}
		}, 5 * 1000);

		setIntervalIdentifier(interval);
	};

	const onButtonUsed = () => {
		if (state.next === 'LINK_USED') {
			dispatch('LINK_USED');
		}
		periodicallyCheckForCredentials();
	};

	const onAuthoriseClicked = async () => {
		const url = await generateLoginWithUniqueLoginCode(loginUrl, uniqueLoginCode);
		bridge().openExternal(url);
		onButtonUsed();
	};

	const onCopyToClipboardClicked = async () => {
		const url = await generateLoginWithUniqueLoginCode(loginUrl, uniqueLoginCode);
		clipboard.writeText(url);
		onButtonUsed();
	};

	useEffect(() => {
		const ulc = uuidgen();
		setUniqueLoginCode(ulc);
	}, []);

	useEffect(() => {
		return () => {
			clearInterval(intervalIdentifier);
		};
	}, [intervalIdentifier]);

	return (
		<div style={styles.page}>
			<div style={containerStyle}>
				<p style={theme.textStyle}>{_('To allow Joplin to synchronise with Joplin Cloud, open this URL in your browser to authorise the application:')}</p>
				<div style={styles.buttonsContainer}>
					<Button
						onClick={onAuthoriseClicked}
						title={_('Authorise')}
						iconName='fa fa-external-link-alt'
						level={ButtonLevel.Recommended}
						style={{ marginRight: '2em' }}
					/>
					<Button
						onClick={onCopyToClipboardClicked}
						title={_('Copy link to website')}
						iconName='fa fa-clone'
						level={ButtonLevel.Secondary}
					/>

				</div>
				<p style={theme[state.style]}>{state.message}</p>
				{state.active === 'LINK_USED' ? <div id="loading-animation" /> : null}
			</div>
			<ButtonBar onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })} />
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		style: state,
	};
};

export default connect(mapStateToProps)(JoplinCloudScreenComponent);
