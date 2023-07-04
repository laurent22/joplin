import * as React from 'react';
import Button, { ButtonLevel } from '../Button/Button';
import { _ } from '@joplin/lib/locale';
const styled = require('styled-components').default;

interface Props {
	backButtonTitle?: string;
	hasChanges?: boolean;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onCancelClick: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onSaveClick?: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onApplyClick?: Function;
}

export const StyledRoot = styled.div`
	display: flex;
	align-items: center;
	padding: 10px;
	background-color: ${(props: any) => props.theme.backgroundColor3};
	padding-left: ${(props: any) => props.theme.configScreenPadding}px;
	border-top-width: 1px;
	border-top-style: solid;
	border-top-color: ${(props: any) => props.theme.dividerColor};
`;

export default function ButtonBar(props: Props) {
	function renderOkButton() {
		if (!props.onSaveClick) return null;
		return <Button style={{ marginRight: 10 }} level={ButtonLevel.Primary} disabled={!props.hasChanges} onClick={props.onSaveClick} title={_('OK')}/>;
	}

	function renderApplyButton() {
		if (!props.onApplyClick) return null;
		return <Button level={ButtonLevel.Primary} disabled={!props.hasChanges} onClick={props.onApplyClick} title={_('Apply')}/>;
	}

	return (
		<StyledRoot>
			<Button
				onClick={props.onCancelClick}
				level={ButtonLevel.Secondary}
				iconName="fa fa-chevron-left"
				title={props.backButtonTitle ? props.backButtonTitle : _('Back')}
			/>
			{ (props.onApplyClick || props.onSaveClick) && (
				<div style={{ display: 'flex', flexDirection: 'row', marginLeft: 30 }}>
					{renderOkButton()}
					{renderApplyButton()}
				</div>
			)}
		</StyledRoot>
	);
}
