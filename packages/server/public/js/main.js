// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function onDocumentReady(fn) {
	if (document.readyState !== 'loading') {
		fn();
	} else {
		document.addEventListener('DOMContentLoaded', fn);
	}
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function setupPasswordStrengthHandler() {
	$('#password_strength').hide();

	const scoreToLabel = {
		0: 'Very weak',
		1: 'Weak',
		2: 'Medium',
		3: 'Strong',
		4: 'Very strong',
	};

	function scoreToClass(score) {
		return score < 3 ? 'has-text-danger-dark' : 'has-text-success-dark';
	}

	function checkPasswordEventHandler() {
		const password = $(this).val();

		if (!password) {
			$('#password_strength').hide();
		} else {
			$('#password_strength').show();
			const result = zxcvbn(password);
			let msg = [`<span class="${scoreToClass(result.score)}">Strength: ${scoreToLabel[result.score]}.</span>`];
			if (result.feedback.warning) msg.push(result.feedback.warning);
			if (result.feedback.suggestions) msg = msg.concat(result.feedback.suggestions);
			$('#password_strength').html(msg.join(' '));
		}
	}

	$('#password').keydown(checkPasswordEventHandler);
	$('#password').keyup(checkPasswordEventHandler);
	$('#password').change(checkPasswordEventHandler);
}
