import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import { AppLockState, AppState } from '../app.reducer';
import Button, { ButtonLevel } from './Button/Button';
import { canAttemptUnlock, nextFailedUnlockState, verifyAppLockPassword } from '../services/appLock/AppLockService';

interface Props {
	appLock: AppLockState;
	themeId: number;
	dispatch: Dispatch;
}

const activityEvents = ['keydown', 'mousedown', 'mousemove', 'wheel', 'touchstart'];

const AppLockScreen = (props: Props) => {
	const { appLock, dispatch } = props;
	const theme = themeStyle(props.themeId);
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [now, setNow] = useState(Date.now());
	const locked = !!appLock.locked;
	const cooldownRemainingMs = Math.max(0, appLock.cooldownUntil - now);
	const cooldownRemainingSeconds = Math.ceil(cooldownRemainingMs / 1000);

	useEffect(() => {
		if (!appLock.enabled || locked || !appLock.idleLockEnabled) return () => {};

		let timeoutId: ReturnType<typeof setTimeout> = null;
		const resetTimer = () => {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				dispatch({ type: 'APP_LOCK_LOCK' });
			}, Math.max(1, appLock.idleMinutes) * 60 * 1000);
		};

		for (const eventName of activityEvents) {
			window.addEventListener(eventName, resetTimer, true);
		}
		resetTimer();

		return () => {
			if (timeoutId) clearTimeout(timeoutId);
			for (const eventName of activityEvents) {
				window.removeEventListener(eventName, resetTimer, true);
			}
		};
	}, [appLock.enabled, appLock.idleLockEnabled, appLock.idleMinutes, dispatch, locked]);

	useEffect(() => {
		if (!cooldownRemainingMs) return () => {};

		const intervalId = setInterval(() => {
			setNow(Date.now());
		}, 250);

		return () => clearInterval(intervalId);
	}, [cooldownRemainingMs]);

	useEffect(() => {
		if (!locked) {
			setPassword('');
			setError('');
		}
	}, [locked]);

	const unlock = useCallback(async () => {
		if (!canAttemptUnlock(appLock)) {
			setError(_('Please wait %d seconds before trying again.', cooldownRemainingSeconds));
			return;
		}

		const passwordOk = await verifyAppLockPassword(password);
		if (passwordOk) {
			dispatch({ type: 'APP_LOCK_UNLOCK_SUCCEEDED' });
			return;
		}

		const nextState = nextFailedUnlockState(appLock);
		dispatch({
			type: 'APP_LOCK_UNLOCK_FAILED',
			failedAttempts: nextState.failedAttempts,
			cooldownUntil: nextState.cooldownUntil,
		});
		setPassword('');
		setError(nextState.cooldownUntil ? _('Too many incorrect attempts. Please wait before trying again.') : _('Incorrect password.'));
	}, [appLock, cooldownRemainingSeconds, dispatch, password]);

	const rootStyle = useMemo((): React.CSSProperties => ({
		position: 'fixed',
		inset: 0,
		zIndex: 100000,
		display: locked ? 'flex' : 'none',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: theme.backgroundColor,
		color: theme.color,
		fontFamily: theme.fontFamily,
	}), [locked, theme]);

	const panelStyle = useMemo((): React.CSSProperties => ({
		width: 'min(420px, calc(100vw - 48px))',
		border: `1px solid ${theme.dividerColor}`,
		borderRadius: 6,
		backgroundColor: theme.backgroundColor3,
		padding: 24,
		boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)',
	}), [theme]);

	const inputStyle = useMemo((): React.CSSProperties => ({
		width: '100%',
		padding: '8px 10px',
		border: `1px solid ${theme.borderColor4}`,
		borderRadius: 4,
		backgroundColor: theme.backgroundColor,
		color: theme.color,
		fontFamily: theme.fontFamily,
		fontSize: theme.fontSize,
	}), [theme]);

	if (!locked) return null;

	return (
		<div
			style={rootStyle}
			role="dialog"
			aria-modal="true"
			aria-label={_('Joplin is locked')}
			onKeyDownCapture={event => {
				event.stopPropagation();
				if (event.key === 'Enter') void unlock();
			}}
		>
			<div style={panelStyle}>
				<h1 style={{ ...theme.textStyle, marginTop: 0, fontSize: 22 }}>{_('Joplin is locked')}</h1>
				<p style={theme.textStyle}>{_('Enter your App Lock password to continue.')}</p>
				<input
					type="password"
					autoFocus
					value={password}
					disabled={cooldownRemainingMs > 0}
					onChange={event => setPassword(event.target.value)}
					style={inputStyle}
					aria-label={_('App Lock password')}
				/>
				<div style={{ minHeight: 22, marginTop: 8, color: theme.colorError }}>
					{cooldownRemainingMs > 0 ? _('Try again in %d seconds.', cooldownRemainingSeconds) : error}
				</div>
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
					<Button
						level={ButtonLevel.Primary}
						title={_('Unlock')}
						disabled={!password || cooldownRemainingMs > 0}
						onClick={() => { void unlock(); }}
					/>
				</div>
			</div>
		</div>
	);
};

const mapStateToProps = (state: AppState) => ({
	appLock: state.appLock,
	themeId: state.settings.theme,
});

export default connect(mapStateToProps)(AppLockScreen);
