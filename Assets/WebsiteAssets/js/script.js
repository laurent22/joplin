function getOs() {
	if (navigator.appVersion.indexOf("Win")!=-1) return "windows";
	if (navigator.appVersion.indexOf("Mac")!=-1) return "macOs";
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

function setupDownloadPage() {
	if (!$('.page-download').length) return;

	const downloadLinks = {};

	$('.page-download .get-it-desktop a').each(function() {
		const href = $(this).attr('href');
		
		if (href.indexOf('-Setup') > 0) downloadLinks['windows'] = href;
		if (href.indexOf('.dmg') > 0) downloadLinks['macOs'] = href;
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
		const os = getOs();
		if (!os || !downloadLinks[os]) {
			// If we don't know, display the section to manually download the app
			$('.page-download .get-it-desktop').show();
		} else if (os === 'linux') {
			// If it's Linux, the user should probably install it using the
			// install script so we redirect to the install section
			window.location = 'https://joplinapp.org/help/#desktop-applications';
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
	setupDownloadPage();
});
