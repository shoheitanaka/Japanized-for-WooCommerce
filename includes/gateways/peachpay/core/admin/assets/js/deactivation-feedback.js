/* eslint-disable dot-notation */

/**
 * @file Adds the deactivation popup and handles submitting the data to the analytics database.
 * @author Kyle Wagner
 */

document.addEventListener('DOMContentLoaded', deactivationPopup);

/**
 * Loads the deactivation modal and submits the POST request to the server.
 */
function deactivationPopup() {
	const deactivationButton = document.querySelector('#deactivate-peachpay-for-woocommerce');
	if (!deactivationButton) {
		return;
	}

	deactivationButton.addEventListener('click', showModal);

	function showModal(event) {
		event.preventDefault();
		const deactivationLink = event.target.href;
		const $modal = document.querySelector('#ppModal');
		$modal.style.display = 'block';
		if (document.querySelector('#modal-content')) {
			return;
		}

		// Manual way of ensuring an install's subdir is included in the supportLink
		// Typically use peachpay_data.wp_home_url, but peachpay_data is undefined here
		const wpAdminURL = deactivationLink.split('/wp-admin/')[0];
		const supportLink = wpAdminURL + '/wp-admin/admin.php?page=peachpay&open_help=1';
		const $modalContent = `
			<div id = "modal-content" class = "modal-content">
				<div id = "modal-header" class = "modal-header">
					<i class="dashicon-shopping-cart" aria-hidden="true"></i>
					<span id = "deactivation-header" class = "deactivation-header"> ${getPluginLocaleText('Feedback', isAdminPageText=true)} </span>
				</div>
				<div id = "modal-message" class = "modal-message">
					<form id = "peachpay-deactivate-feedback-form" method = "post" enctype = "multipart/form-data" >
						<div id = "peachpay-deactivate-feedback-form-caption" class = "peachpay-deactivate-feedback-form-caption">
						${getPluginLocaleText("Please help us understand why you don't intend to use PeachPay.", isAdminPageText=true)}
						</div>
						<div id = "peachpay-deactivate-feedback-form-wrapper" class = "peachpay-deactivate-feedback-form-wrapper">
							<div id = "peachpay-deactivate-feedback-input-wrapper" class = "feedback-input">
								<input id = "peachpay-deactivate-feedback-no-longer-needed"
								class = "peachpay-deactivate-feedback-input"
								type = "radio" name = "deactivation_answer"
								value = "no-longer-needed" >
								<label for = "peachpay-deactivate-feedback-no-longer-needed" class = "peachpay-deactivate-feedback-label">
								${getPluginLocaleText('I no longer need the plugin', isAdminPageText=true)}</label>
							</div>
							<div id = "peachpay-deactivate-feedback-input-wrapper" class = "feedback-input">
								<input id = "peachpay-deactivate-feedback-better-plugin"
								class = "peachpay-deactivate-feedback-input"
								type = "radio" name = "deactivation_answer"
								value = "better-plugin" >
								<label for = "peachpay-deactivate-feedback-better-plugin" class = "peachpay-deactivate-feedback-label">
								${getPluginLocaleText('I found a better plugin', isAdminPageText=true)}</label>
								<input type="text" id = "better_plugin" name = "better_plugin" class = "reason_dropdown_input"
								placeholder = "${getPluginLocaleText('Please share which plugin', isAdminPageText=true)}">
							</div>
							<div id = "peachpay-deactivate-feedback-input-wrapper" class = "feedback-input">
								<input id = "peachpay-deactivate-feedback-couldnt-get-to-work"
								class = "peachpay-deactivate-feedback-input"
								type = "radio" name = "deactivation_answer"
								value = "couldnt-get-to-work" >
								<label for = "peachpay-deactivate-feedback-couldnt-get-to-work" class = "peachpay-deactivate-feedback-label">
								${getPluginLocaleText("I couldn't get the plugin to work", isAdminPageText=true)}</label>
								<div type="text" id = "was_support_contacted" class = "reason_dropdown_input">
								<img src = "https://cdn3.iconfinder.com/data/icons/google-material-design-icons/48/ic_info_outline_48px-512.png"
								height = "20" width = "20">
								<span class = "customer-support-ask"> ${getPluginLocaleText('Did you try contacting support via email or the', isAdminPageText=true)}</span>
								<a href = "${supportLink}" class = "customer-support-ask">${getPluginLocaleText('customer support feature', isAdminPageText=true)}</a>
								<span style="padding-top: 5px;" >?</span>
								</div>
							</div>
							<div id = "peachpay-deactivate-feedback-input-wrapper" class = "feedback-input">
								<input id = "peachpay-deactivate-feedback-temporary-deactivation"
								class = "peachpay-deactivate-feedback-input"
								type = "radio" name = "deactivation_answer"
								value = "temporary-deactivation">
								<label for = "peachpay-deactivate-feedback-temporary-deactivation" class = "peachpay-deactivate-feedback-label">
								${getPluginLocaleText('customer support feature', isAdminPageText=true)}</label>
							</div>
							<div id = "peachpay-deactivate-feedback-input-wrapper" class = "feedback-input">
								<input id = "peachpay-deactivate-feedback-other"
								class = "peachpay-deactivate-feedback-input"
								type = "radio" name = "deactivation_answer"
								value = "other" >
								<label for = "peachpay-deactivate-feedback-other" class = "peachpay-deactivate-feedback-label">
								${getPluginLocaleText('Other', isAdminPageText=true)}</label>
								<input type="text" id = "other_reason" name = "other_reason" class = "reason_dropdown_input"
								placeholder = "${getPluginLocaleText('Please share your reason', isAdminPageText=true)}">
							</div>
						</div>
					</form>
				</div>
				<div class = "modal-buttons-wrapper">
					<button id = "pp-deactivate-button" form="peachpay-deactivate-feedback-form"
					class="feedback-button-submit" name = "form_submit">
						<object id = "loading-spinner"
						type = "image/svg+xml"
						data = "${spinnerURL(false)}"
						height="20"
						width="20"
						class = "pp-spinner hide">
						</object>
						<div id = "pp-deactivate-content"> ${getPluginLocaleText('Submit & Deactivate', isAdminPageText=true)} </div>
					</button>
					<a href = ${deactivationLink} class="feedback-button-skip"> ${getPluginLocaleText('Skip & Deactivate', isAdminPageText=true)} </a>
				</div>
			</div>`;
		$modal.insertAdjacentHTML('afterbegin', $modalContent);
		$modal.addEventListener('click', hideModal);

		const $form = document.querySelector('#peachpay-deactivate-feedback-form');

		$form.addEventListener('submit', async event => {
			event.preventDefault();
			const $feedbackInputs = document.querySelectorAll('.peachpay-deactivate-feedback-input');
			let isEmpty = true;
			for (const element of $feedbackInputs) {
				if (element.checked) {
					isEmpty = false;
					continue;
				}
			}

			if (isEmpty) {
				event.preventDefault();
				return;
			}

			document.querySelector('#loading-spinner').classList.remove('hide');
			document.querySelector('#pp-deactivate-content').classList.add('hide');

			const formData = new FormData($form);
			formData.append('website', location.hostname);
			await fetch(`${basePeachPayAPIURL(location.hostname, deactivation_peachpay_data.test_mode)}/api/v1/analytics/plugin-deactivation`,
				{
					method: 'POST',
					body: formData,
				});
			window.location = deactivationLink;
		});

		const $betterPluginInput = document.querySelector('#peachpay-deactivate-feedback-better-plugin');
		const $didNotWorkInput = document.querySelector('#peachpay-deactivate-feedback-couldnt-get-to-work');
		const $otherReasonInput = document.querySelector('#peachpay-deactivate-feedback-other');

		$betterPluginInput.addEventListener('click', () => handleInput('betterPlugin'));
		$didNotWorkInput.addEventListener('click', () => handleInput('didNotWork'));
		$otherReasonInput.addEventListener('click', () => handleInput('otherReason'));

		const $notNeededInput = document.querySelector('#peachpay-deactivate-feedback-no-longer-needed');
		const $temporaryDeactivationInput = document.querySelector('#peachpay-deactivate-feedback-temporary-deactivation');

		$notNeededInput.addEventListener('click', () => handleInput('noFieldBelow'));
		$temporaryDeactivationInput.addEventListener('click', () => handleInput('noFieldBelow'));
	}
}

/**
 * Hides the modal and resets the form.
 * @param {object} event
 */
function hideModal(event) {
	if (!event.target.id || event.target.id !== 'ppModal') {
		return;
	}

	document.querySelector('#loading-spinner').classList.add('hide');
	document.querySelector('#pp-deactivate-content').classList.remove('hide');
	document.querySelector('#peachpay-deactivate-feedback-form').reset();
	const $feedbackInputs = document.querySelectorAll('.reason_dropdown_input');
	for (const element of $feedbackInputs) {
		element.style.display = 'none';
	}

	event.target.style.display = 'none';
}

/**
 * Shows the correct text input and hides other text inputs accordingly
 * @param {string} type
 */
function handleInput(type) {
	const $feedbackInputs = document.querySelectorAll('.reason_dropdown_input');
	for (const element of $feedbackInputs) {
		element.style.display = 'none';
	}

	switch (type) {
		case 'noFieldBelow':
			break;
		case 'betterPlugin':
			document.querySelector('#better_plugin').style.display = 'inline';
			break;
		case 'didNotWork':
			document.querySelector('#was_support_contacted').style.display = 'flex';
			break;
		case 'otherReason':
			document.querySelector('#other_reason').style.display = 'inline';
			break;
		default:
			break;
	}
}
