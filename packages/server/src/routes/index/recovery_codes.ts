import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import defaultView from '../../utils/defaultView';
import { profileUrl, recoveryCodesAuthUrl, recoveryCodesUrl } from '../../utils/urlUtils';
import { _ } from '@joplin/lib/locale';
import { createCsrfTag } from '../../utils/csrf';
import { bodyFields, userIp } from '../../utils/requestUtils';
import { cookieSet } from '../../utils/cookies';
import limiterLoginBruteForce from '../../utils/request/limiterLoginBruteForce';

type RecoveryCodeAuthInputs = {
	password?: string;
	mfaCode?: string;
};

const router = new Router(RouteType.Web);

const recoveryCodeAuthView = async (ctx: AppContext, error?: Error) => {
	const showMfaCode = !!ctx.query.show_mfa_code;
	const showPassword = !!ctx.query.show_password && !showMfaCode;
	return {
		...defaultView('recovery_codes/auth', 'Recovery codes '),
		content: {
			error: error,
			csrfTag: await createCsrfTag(ctx),
			title: _('Confirm credentials'),
			description: _('To access your recovery codes please enter an authentication code or your password.'),
			buttonTitle: _('Confirm'),
			postUrl: recoveryCodesAuthUrl(),
			authWithMfaCodeUrl: recoveryCodesAuthUrl(false, true),
			authWithPasswordUrl: recoveryCodesAuthUrl(true, false),
			showPassword: showPassword,
		},
	};
};

router.post('recovery_codes', async (_path: SubPath, ctx: AppContext) => {
	const owner = ctx.joplin.owner;

	await ctx.joplin.models.recoveryCode().regenerate(owner.id);

	const recoveryCodeAccessKey = await ctx.joplin.models.recoveryCode().saveRecoveryCodeAccessKey(owner.id);
	cookieSet(ctx, 'recoveryCodeAccessKey', recoveryCodeAccessKey);

	return redirect(ctx, recoveryCodesUrl());
});

router.get('recovery_codes', async (_path: SubPath, ctx: AppContext) => {
	const owner = ctx.joplin.owner;

	const { isValid, isNewlyCreated } = await ctx.joplin.models.recoveryCode().isRecoveryCodeAccessKeyValid(owner.id, ctx.cookies.get('recoveryCodeAccessKey'));

	if (!isValid) {
		return redirect(ctx, recoveryCodesAuthUrl());
	}

	const codes = await ctx.joplin.models.recoveryCode().loadByUserId(owner.id);

	const codesToRender = codes
		.map(code => {
			return {
				...code,
				isUsedText: code.is_used ? _('Used') : _('Not Used'),
			};
		});

	const view = {
		...defaultView('recovery_codes', 'Recovery codes'),
		content: {
			csrfTag: await createCsrfTag(ctx),
			codes: codesToRender,
			buttonTitle: 'Generate new codes',
			postUrl: recoveryCodesUrl(),
			profileUrl: profileUrl(),
			isNewlyCreated,
		},
	};

	return view;
});

router.get('recovery_codes/auth', async (_path: SubPath, ctx: AppContext) => {
	return recoveryCodeAuthView(ctx);
});

router.post('recovery_codes/auth', async (_path: SubPath, ctx: AppContext) => {
	await limiterLoginBruteForce(userIp(ctx));

	const owner = ctx.joplin.owner;

	const fields = await bodyFields<RecoveryCodeAuthInputs>(ctx.req);

	try {
		await ctx.joplin.models.recoveryCode().checkCredentials(owner.id, fields.password, fields.mfaCode);
		const recoveryCodeAccessKey = await ctx.joplin.models.recoveryCode().saveRecoveryCodeAccessKey(owner.id);
		cookieSet(ctx, 'recoveryCodeAccessKey', recoveryCodeAccessKey);
	} catch (error) {
		return recoveryCodeAuthView(ctx, error);
	}

	return redirect(ctx, recoveryCodesUrl());
});

export default router;
