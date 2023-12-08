import { Reducer, useEffect, useReducer, useState } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../app.reducer';
import Setting from '@joplin/lib/models/Setting';
import { clipboard } from 'electron';
import Button, { ButtonLevel } from './Button/Button';
import { reg } from '@joplin/lib/registry';
const bridge = require('@electron/remote').require('./bridge').default;

const { connect } = require('react-redux');
const { themeStyle } = require('@joplin/lib/theme');

interface Props {
	themeId: string;
	style: any;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}

type Events = 'LINK_USED' | 'COMPLETED';

type IntitialValues = {
	style: string;
	message: string;
	next: Events;
	active: Events | 'INITIAL';
};

const intitialValues: IntitialValues = {
	style: 'textStyle',
	message: _('Waiting for authorisation...'),
	next: 'LINK_USED',
	active: 'INITIAL',
};

const reducer: Reducer<IntitialValues, Events> = (state: IntitialValues, action: Events) => {
	switch (action) {
	case 'LINK_USED': {
		return {
			style: 'textStyle',
			message: _('If you have already authorised, please wait for the application to sync to Joplin Cloud.'),
			next: 'COMPLETED',
			active: 'LINK_USED',
		};
	}
	case 'COMPLETED': {
		return {
			style: 'h2Style',
			message: _('You are logged in into Joplin Cloud, you can leave this page now.'),
			active: 'COMPLETED',
			next: 'COMPLETED',
		};
	}
	default: {
		return state;
	}
	}
};

const styles = {
	page: { display: 'flex', flexDirection: 'columns' height: '100%' },
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

	const checkIfLoginWasSuccessful = async (ulc: string) => {
		try {
			const response = await fetch(`${Setting.value('sync.10.path')}/api/applications?unique_login_code=${ulc}`);
			if (!response) return undefined;

			if (response.status === 200) {
				return response?.json();
			}

			const jsonBody = await response?.json();

			if (jsonBody && response.status >= 400 && response.status <= 500) {
				reg.logger().warn('Server could not retrieve application credential', jsonBody);
				return undefined;
			}

			reg.logger().error('Server error when trying to get the application credential', jsonBody);
		} catch (error) {
			reg.logger().error('Not able to complete request to api/applications', error);
		}
	};

	const tryUniqueLoginCode = () => {
		const interval = setInterval(async () => {
			const r = await checkIfLoginWasSuccessful(uniqueLoginCode);
			if (r && (r.id && r.password)) {
				Setting.setValue('sync.10.username', r.id);
				Setting.setValue('sync.10.password', r.password);
				clearInterval(interval);
				dispatch('COMPLETED');
				return;
			}
		}, 5 * 1000);

		setIntervalIdentifier(interval);
	};

	const onButtonUsed = () => {
		if (state.next === 'LINK_USED') {
			dispatch('LINK_USED');
		}
		tryUniqueLoginCode();
	};

	const onAuthoriseClicked = () => {
		bridge().openExternal(`${Setting.value('sync.10.website')}/login?unique_login_code=${uniqueLoginCode}`);
		onButtonUsed();
	};

	const onCopyToClipboardClicked = () => {
		clipboard.writeText(`${Setting.value('sync.10.website')}/login?unique_login_code=${uniqueLoginCode}`);
		onButtonUsed();
	};

	useEffect(() => {
		const ulc = Math.random().toString().split('.')[1];
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
