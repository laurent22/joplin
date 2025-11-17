import { _ } from '../../locale';
import Setting from '../../models/Setting';
import shim from '../../shim';
import { authenticateWithCode } from '../../SyncTargetJoplinServerSAML';
import prefixWithHttps from '../../utils/prefixWithHttps';
import SsoScreenShared from './SsoScreenShared';

export default class SamlShared implements SsoScreenShared {
	public openLoginPage() {
		const samlUrl = Setting.value('sync.11.path');
		if (!samlUrl) {
			const message = _('No URL for SAML authentication set.');
			void shim.showErrorDialog(message);

			throw new Error(message);
		}

		shim.openUrl(`${prefixWithHttps(samlUrl)}/login/sso-saml-app`);
		return Promise.resolve();
	}

	public processLoginCode(code: string) {
		if (this.isLoginCodeValid(code)) {
			return authenticateWithCode(this.cleanCode(code));
		} else {
			return Promise.resolve(false);
		}
	}

	public isLoginCodeValid(code: string) {
		const cleanedCode = this.cleanCode(code);
		return !isNaN(+cleanedCode) && cleanedCode.length === 9;
	}

	private cleanCode(code: string) {
		return code.replace(/\s|-/gi, '');
	}
}
