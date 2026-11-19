import JoplinError from '../../JoplinError';
import { ErrorCode } from '../../errors';
import { BaseItemEntity } from '../../services/database/types';

export interface PlaintextUploadConfirmation {
	id: string;
	// The version that the user confirmed. A confirmation with a null updatedTime covers any version of the item.
	updatedTime: number|null;
}

export type PlaintextUploadConfirmations = ReadonlyMap<string, number|null>;

// Called when E2EE is enabled but the item would be uploaded unencrypted.
const checkPlaintextUploadConfirmed = (item: BaseItemEntity, confirmations: PlaintextUploadConfirmations|null) => {
	const confirmedTime = confirmations?.get(item.id);
	// Sync can sometimes take a long time. Check the confirmed time to verify that the item hasn't changed since approval:
	if (confirmedTime === null || (confirmedTime !== undefined && confirmedTime === item.updated_time)) return;
	throw new JoplinError(`Item ${item.id} would be uploaded without encryption, which has not been confirmed`, ErrorCode.PlaintextUploadNotConfirmed);
};
export default checkPlaintextUploadConfirmed;
