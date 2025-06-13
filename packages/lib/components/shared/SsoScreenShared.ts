interface SsoScreenShared {
	openLoginPage(): Promise<void>;
	processLoginCode(code: string): Promise<boolean>;
	isLoginCodeValid(code: string): boolean;
}

export default SsoScreenShared;
