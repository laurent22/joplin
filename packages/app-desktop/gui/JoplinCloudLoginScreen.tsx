import { useEffect, useState } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../app.reducer';
import Setting from '@joplin/lib/models/Setting';
const bridge = require('@electron/remote').require('./bridge').default;

const { connect } = require('react-redux');
const { themeStyle } = require('@joplin/lib/theme');

interface Props {
	themeId: string;
	style: any;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}

const JoplinCloudScreenComponent = (props: Props) => {

	const style = props.style;
	const theme = themeStyle(props.themeId);
	const [uniqueLoginCode, setUniqueLoginCode] = useState(undefined);

	const containerStyle = { ...theme.containerStyle, padding: theme.configScreenPadding,
		height: style.height - theme.margin * 2,
		flex: 1 };

	const checkIfLoginWasSuccessful = async (ulc: string) => {
		let response = undefined;
		try {
			response = await fetch(`http://api.joplincloud.local:22300/api/applications?unique_login_code=${ulc}`);
			if (!response || response.status !== 200) {
				return undefined;
			}
		} catch (error) {
			console.error(error);
		}

		return response?.json();
	};

	useEffect(() => {
		const ulc = Math.random().toString().split('.')[1];
		setUniqueLoginCode(ulc);
		const interval = setInterval(async () => {
			const r = await checkIfLoginWasSuccessful(ulc);
			if (r && (r.id && r.password)) {
				Setting.setValue('sync.10.username', r.id);
				Setting.setValue('sync.10.password', r.password);
				clearInterval(interval);
				return;
			}
		}, 3 * 1000);
		return () => {
			clearInterval(interval);
		};
	}, []);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			<div style={containerStyle}>
				<p style={theme.textStyle}>{_('To make login in Joplin Cloud, please follow the link bellow, make the login if necessary, and authorise the application.')}</p>
				<a
					style={theme.link}
					onClick={() => bridge().openExternal(`http://joplincloud.local:22300/login?unique_login_code=${uniqueLoginCode}`)}
					href="#">
					{_('Go to Joplin Cloud')}
				</a>
			</div>
			<div style={containerStyle}>
				<p style={theme.textStyle}>{_('After you authorised the application you might have to wait some seconds for it work.')}</p>
				<p style={theme.textStyle}>{_('Not authorised yet')}</p>
			</div>
			<ButtonBar
				onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })}
			/>
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
