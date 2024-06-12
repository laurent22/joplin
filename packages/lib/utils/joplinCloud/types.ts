enum AccountType {
	Default = 0,
	Basic = 1,
	Pro = 2,
	Team = 3,
}

// eslint-disable-next-line import/prefer-default-export
export function accountTypeToString(accountType: AccountType): string {
	if (accountType === AccountType.Default) return 'Default';
	if (accountType === AccountType.Basic) return 'Basic';
	if (accountType === AccountType.Pro) return 'Pro';
	if (accountType === AccountType.Team) return 'Team';
	const exhaustivenessCheck: never = accountType;
	throw new Error(`Invalid type: ${exhaustivenessCheck}`);
}
