import { SubPath, internalRedirect, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields, contextSessionId } from '../../utils/requestUtils';
import { ErrorForbidden } from '../../utils/errors';
import config from '../../config';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { mfaUrl, recoveryCodesUrl } from '../../utils/urlUtils';
import { createCsrfTag } from '../../utils/csrf';
import { totp } from 'otplib';
const thirtyTwo = require('thirty-two');
import { randomBytes } from 'crypto';
import { checkConsecutiveMFACodes } from '../../utils/crypto';
import { profileUrl } from '../../utils/urlUtils';
import { getIsMFAEnabled } from '../../models/utils/user';
import * as QRCode from 'qrcode';
import { cookieSet } from '../../utils/cookies';

const router = new Router(RouteType.Web);

type MFAWebpageContent = {
	isMFAEnabled: boolean;
	csrfTag: string;
	buttonTitle: string;
	title: string;
	postUrl?: string;
	totpSecret?: string;
	qrcodeImage?: string;
	error?: Error;
};

router.get('mfa/:id', async (path: SubPath, ctx: AppContext, fields: Enable2FaFormData = null, error: Error = null) => {
	const owner = ctx.joplin.owner;

	if (path.id !== 'me' && path.id !== owner.id) throw new ErrorForbidden();

	const user = await ctx.joplin.models.user().load(owner.id, { fields: ['totp_secret'] });
	const isMFAEnabled = getIsMFAEnabled(user);

	const content: MFAWebpageContent = {
		isMFAEnabled,
		title: '',
		buttonTitle: '',
		csrfTag: await createCsrfTag(ctx),
	};

	if (isMFAEnabled) {
		content.title = 'Disable multi-factor authentication';
		content.buttonTitle = 'Disable MFA';

	} else {
		let secretEncoded = fields?.totpSecret;
		if (!secretEncoded) {
			const secret = randomBytes(20);
			secretEncoded = thirtyTwo.encode(secret);
		}

		content.title = 'Enable multi-factor authentication';
		content.buttonTitle = 'Enable MFA';
		content.postUrl = mfaUrl(owner.id);
		content.totpSecret = secretEncoded;
		content.qrcodeImage = await QRCode.toDataURL(totp.keyuri(owner.email, config().appName, secretEncoded));
		content.error = error;
	}

	content.isMFAEnabled = isMFAEnabled;

	const view: View = {
		...defaultView('mfa', content.title),
		content,
	};

	return view;
});

interface Enable2FaFormData {
	postButton: string;
	formType: 'disableMFA' | 'enableMFA';
	password?: string;
	totpSecret?: string;
	confirmCode?: string;
	confirmCode2?: string;
}

router.post('mfa/:id', async (path: SubPath, ctx: AppContext) => {
	const owner = ctx.joplin.owner;

	if (path.id !== 'me' && path.id !== owner.id) throw new ErrorForbidden();

	const fields = await bodyFields<Enable2FaFormData>(ctx.req);

	if (fields.formType === 'disableMFA') {
		const passwordIsValid = await ctx.joplin.models.user().isPasswordValid(owner.id, fields.password);
		if (!passwordIsValid) {
			return redirect(ctx, profileUrl());
		}
		await ctx.joplin.models.user().disableMFA(owner.id);

		return redirect(ctx, profileUrl());
	} else {

		const isVerified = checkConsecutiveMFACodes(fields.totpSecret, fields.confirmCode, fields.confirmCode2);

		if (!isVerified) {
			return internalRedirect(path, ctx, router, 'mfa/:id', fields, new ErrorForbidden('The code wasn\'t valid, try again.'));
		}

		await ctx.joplin.models.user().enableMFA(owner.id, fields.totpSecret, contextSessionId(ctx));
	}

	const recoveryCodeAccessKey = await ctx.joplin.models.recoveryCode().saveRecoveryCodeAccessKey(owner.id);
	cookieSet(ctx, 'recoveryCodeAccessKey', recoveryCodeAccessKey);
	return redirect(ctx, recoveryCodesUrl());
});

export default router;
