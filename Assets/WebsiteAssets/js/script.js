async function getOs() {

	// The macOS release is available for Intel and Apple silicon processors,
	// and the only way to get that info is through this new
	// `getHighEntropyValues` function (which is not available on all browsers).
	// So here we either return "macOs" for Intel or "macOsM1" for Apple
	// Silicon. If we don't know which it is, we return "macOsUndefined".
	// https://stackoverflow.com/a/75177111/561309

	if (navigator.appVersion.indexOf("Mac")!=-1) {
		let platformInfo = null;
		try {
			platformInfo = await navigator.userAgentData.getHighEntropyValues(['architecture'])
		} catch (error) {
			console.warn('Failed getting Mac architecture:', error);
			return 'macOsUndefined';
		}

		console.info('Got platform info:', platformInfo);

		if (platformInfo.architecture === 'arm') {
			return "macOsM1";
		} else {
			return "macOs";
		}
	}

	if (navigator.appVersion.indexOf("Win")!=-1) return "windows";
	if (navigator.appVersion.indexOf("X11")!=-1) return "linux";
	if (navigator.appVersion.indexOf("Linux")!=-1) return "linux";
	return null;
}

function getFilename(path) {
	if (!path) return '';
	const s = path.split('/');
	const urlWithParams = s.pop();
	const s2 = urlWithParams.split('?');
	return s2[0];
}

function getMobileOs() {
	var userAgent = navigator.userAgent || navigator.vendor || window.opera;

	// Windows Phone must come first because its UA also contains "Android"
	if (/windows phone/i.test(userAgent)) {
		return "windowsPhone";
	}

	if (/android/i.test(userAgent)) {
		return "android";
	}

	// iOS detection from: http://stackoverflow.com/a/9039885/177710
	if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
		return "ios";
	}

	return "";
}


function setupMobileMenu() {
	$("#open-menu-mobile").click(function () {
		$("#menu-mobile").animate({ "margin-right": "0px" }, 300);
	});

	$("#close-menu-mobile").click(function () {
		$("#menu-mobile").animate({ "margin-right": "-300px" }, 300);
	});
}

async function setupDownloadPage() {
	if (!$('.page-download').length) return;

	const downloadLinks = {};

	$('.page-download .get-it-desktop a').each(function() {
		const href = $(this).attr('href');
		
		if (href.indexOf('-Setup') > 0) downloadLinks['windows'] = href;
		if (href.indexOf('.dmg') > 0) downloadLinks['macOs'] = href;
		if (href.endsWith('arm64.DMG')) downloadLinks['macOsM1'] = href;
		if (href.indexOf('.AppImage') > 0) downloadLinks['linux'] = href;
	});

	$('.page-download .get-it-desktop').hide();

	$('.page-download .download-click-here').click((event) => {
		event.preventDefault();
		$('.page-download .get-it-desktop').show(500);
	});

	const mobileOs = getMobileOs();

	if (mobileOs) {
		$('.page-download .intro').hide();
	} else {
		const os = await getOs();

		if (os === 'macOsUndefined') {
			// If we don't know which macOS version it is, we let the user choose.
			$('.main-content .intro').html('<p class="macos-m1-info">The macOS release is available for Intel processors or for Apple Silicon (M1) processors. Please select your version:</p>');
			const macOsLink = $('.download-link-macOs');
			const macOsM1Link = $('.download-link-macOsM1');
			$('.macos-m1-info').after('<p style="font-style: italic; font-size: .8em;">To find out what processor you have, click on the <b>Apple logo</b> in the macOS menu bar, choose <b>About This Mac</b> from the dropdown menu. If you have an Apple silicon it should say"Apple M1" under "Chip". Otherwise you have an Intel processor.</p>');
			$('.macos-m1-info').after(macOsM1Link);
			$('.macos-m1-info').after(macOsLink);
		} else if (!os || !downloadLinks[os]) {
			// If we don't know, display the section to manually download the app
			$('.page-download .get-it-desktop').show();
		} else if (os === 'linux') {
			// If it's Linux, the user should probably install it using the
			// install script so we redirect to the install section
			window.location = 'https://joplinapp.org/help/install';
		} else {
			// Otherwise, start the download
			const downloadLink = downloadLinks[os];
			$('.downloaded-filename').text(getFilename(downloadLink));
			window.location = downloadLink;
		}
	}
}

$(function () {
	setupMobileMenu();
	void setupDownloadPage();
});
