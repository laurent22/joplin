import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import Button, { ButtonLevel } from '../../Button/Button';
import { useCallback, useState } from 'react';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('SettingButton');

interface Props {
	settingKey: string;
	onSettingButtonClick: (key: string)=> Promise<void>;
}

const SettingButton: React.FC<Props> = ({
	settingKey, onSettingButtonClick,
}) => {
	const key = settingKey;
	const md = Setting.settingMetadata(key);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string|null>(null);

	const onClick = useCallback(async () => {
		setError(null);
		setLoading(true);

		try {
			await onSettingButtonClick(key);
		} catch (error) {
			logger.warn('Failed to run command for button', key, error);
			setError(String(error));
		} finally {
			setLoading(false);
		}
	}, [key, onSettingButtonClick]);

	return <>
		<Button
			level={ButtonLevel.Secondary}
			title={md.label()}
			onClick={onClick}
			disabled={loading}
		/>
		{error && <span className='error'>{error}</span>}
	</>;
};

export default SettingButton;
