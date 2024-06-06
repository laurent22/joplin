// duplicated, should be refactored before merge
export enum AccountType {
	Default = 0,
	Basic = 1,
	Pro = 2,
}

export function accountTypeToString(accountType: AccountType): string {
	if (accountType === AccountType.Default) return 'Default';
	if (accountType === AccountType.Basic) return 'Basic';
	if (accountType === AccountType.Pro) return 'Pro';
	throw new Error(`Invalid type: ${accountType}`);
}

