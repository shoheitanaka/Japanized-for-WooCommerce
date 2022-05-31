/* eslint-disable dot-notation */

/**
 * @file Adds the deactivation popup and handles The necessary fields editor functionality for the whole modal and the buttons
 * @author Brendan Yeong
 */

document.addEventListener('DOMContentLoaded', () => {
	addNewField();
	enableField();
	disableField();
	removeField();
	editField();
	reorderFields();
	selectAllCheckbox();
});

function reorderFields() {
	const drag = document.querySelector('#field-table');

	drag.addEventListener('drop', event => {
		event.preventDefault();
		const currentRow = document.querySelector('.field-data-row[draggable=true]');
		const targetRow = event.target.closest('.field-data-row');
		const all = Array.from(document.querySelectorAll('.field-data-row'));
		const currentRowIndex = all.indexOf(currentRow);
		const targetRowIndex = all.indexOf(targetRow);
		if(currentRowIndex !== targetRowIndex) {
			currentRow.remove();
			targetRow.insertAdjacentElement((currentRowIndex - targetRowIndex) > 0 ? 'beforebegin' : 'afterend', currentRow);
		}
		document.querySelectorAll('.field-data-row').forEach((row) => {
			row.setAttribute('draggable', false);
		});
	});

	drag.addEventListener('mousedown', event => {
		const target = event.target;

		if(!target) {
			return;
		}

		if(target.closest('.dragable-icon')) {
			const row = target.closest('.field-data-row');
			row.setAttribute('draggable', true);
		}
	});

	drag.addEventListener('dragover', event => {
		// Prevent default to allow drop
		event.preventDefault();
	}, false);
	
}

function addNewField() {
	const newFieldPopUp = document.querySelectorAll('#field-table .field-button');

	for (const button of newFieldPopUp) {
		button.addEventListener('click', event => showModal(event));
	}
}

function editField() {
	const editFieldButton = document.querySelectorAll('#field-table .edit-field');

	for (const button of editFieldButton) {
		button.addEventListener('click', editModal);
	}

	function editModal(event) {
		const selectedEditButton = document.querySelector(
			'#field-table #' + event.target.value,
		);
		showModal(event);
		insertEditData(selectedEditButton.value);
	}
}

function showModal(event) {
	event.preventDefault();
	const $modal = document.querySelector('#ppModal');
	$modal.style.display = 'block';
	if (document.querySelector('#modal-content')) {
		return;
	}

	const $modalContent = `
	<div id="modal-content" class="modal-new-field-content col flex">
	<div id="modal-header" class="new-field-modal-header">
		<span id="deactivation-header" class="new-field-header bold"
			>${window.pp_i18n['FIELD DETAILS'][getLanguage()]}
		</span>
		<i class="dashicon-close" id="close" aria-hidden="true"></i>
	</div>
	<div>
		<form id="field-info" class="modal-add-field form" method="post">
			<label for="field-type" class ="select-lable flex"
					>${window.pp_i18n['Type:'][getLanguage()]} <abbr class="required" title="required">*</abbr>
			</label>
			<div class="input-field">
				<select id="field_type" class="p-1 input-box pp-w-100" name="type_list" form="field-info">
					<option value="text">${window.pp_i18n['Text'][getLanguage()]}</option>
					<option value="select">Select</option>
					<option value="radio">Radio</option>
					<!-- <option value="textarea">Textarea</option> -->
				</select>
			</div>
			<div class="input-field flex">
				<input
					id="field_name"
					class="input-box pp-w-100"
					type="text"
					name="field_name"
					value="additional_"
					placeholder=" "
					pattern="[a-z_]+[a-z0-9_]*"
					oninvalid="setCustomValidity('The name should start with a lowercase letter or underscore and be followed by any number of lowercase letters, digits or underscores.')"
					oninput="setCustomValidity('')"
					style="flex: 0 1 210%;"
					required
				/>
				<label for="field_name" class="form-label">
				${window.pp_i18n['Name:'][getLanguage()]} &#40;${window.pp_i18n['must be unique'][getLanguage()]}&#41;
					<abbr class="required" title="required">*</abbr> </label
				><br />
			</div>
			<div class="input-field flex">
				<input
					id="field_label"
					class="input-box pp-w-100"
					type="text"
					name="field_label"
					placeholder=" "
					required
				/>
				<label for="field_label" class="form-label">
				${window.pp_i18n['Label:'][getLanguage()]} <abbr class="required" title="required">*</abbr> </label><br />
			</div>
			<div id="field_default_box" class="input-field flex">
				<input
					id="field_default"
					class="input-box pp-w-100"
					type="text"
					name="field_default"
					placeholder=" "
				/>
				<label for="field_default" class="form-label">${window.pp_i18n['Default value:'][getLanguage()]} </label>
				<br />
			</div>
			<div class="input-checkboxes">
				<div class="input-checkboxes">
					<input
						id="field_required"
						type="checkbox"
						name="field_required"
						value="yes"
					/>
					<label for="field_required" >${window.pp_i18n['Required'][getLanguage()]} </label><br />
				</div>
				<div class="input-checkboxes">
					<input
						id="field_enable"
						type="checkbox"
						name="field_enable"
						value="yes"
					/>
					<label for="field_enable"> ${window.pp_i18n['Enable'][getLanguage()]} </label><br />
				</div>
				<!-- <div class="input-checkboxes">
					<input
						id="field_display_email"
						type="checkbox"
						name="field_display_email"
						value="yes"
					/>
					<label for="field_display_email"> ${window.pp_i18n['Display in email'][getLanguage()]} </label><br />
				</div>
				<div class="input-checkboxes">
					<input
						id="field_display_order_details"
						type="checkbox"
						name="field_display_order_details"
						value="yes"
					/>
					<label for="field_display_order_details"> ${window.pp_i18n['Display in Order Detail'][getLanguage()]} </label><br />
				</div> -->
			</div>
			<div id="option-list-summary" class="p-05 hide">
				<div id="pp-option-list-dropdown" class="pp-option-dropdown-box pp-b-radius-05 flex" aria-expanded="false">
					<label id="pp-option-label" class="select-lable pp-w-100 flex">Option Lists
					<i class="pp-up-icon pp-summary-option-icon pp-option-dropdown-box-icon hide" aria-hidden="true"></i>
					<i class="pp-down-icon pp-summary-option-icon pp-option-dropdown-box-icon" aria-hidden="true"></i></label> 
				</div>
				<!-- Generate the option list when needed -->
				<div id="list-summary" class="pp-option-summary-box p-05">
					<div id="list-item">
						
					</div>
				</div>
			</div>
			<div class="submit-field flex">
				<button
					type="submit"
					class="field-button-submit button-primary"
				>
				${window.pp_i18n['Submit'][getLanguage()]}
				</button>
			</div>
		</form>
	</div>
</div>
`;

	$modal.insertAdjacentHTML('afterbegin', $modalContent);
	$modal.addEventListener('click', hideAddFieldModal);
	$modal.addEventListener('change', showOptionList);

	initOptionSummaryEvents();
}

function initOptionSummaryEvents() {
	const optionList = document.querySelector("#list-item");
	optionList.addEventListener('click', addOptionRow);
	optionList.addEventListener('click', deleteOptionRow);
	optionList.addEventListener('drop', stopDraggingOptionRow);
	optionList.addEventListener('mousedown', dragOptionRow);
	optionList.addEventListener('dragover', event => {
		// Prevent default to allow drop
		event.preventDefault();
	}, false);
	document.querySelector('#pp-option-list-dropdown')?.addEventListener('click', optionSummaryDropdown);
	document.querySelector('#pp-option-list-dropdown')?.addEventListener('keypress', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			optionSummaryDropdown();
		}
	});
}

function optionSummaryDropdown() {
	let dropdown = document.querySelector('#pp-option-list-dropdown')?.getAttribute('aria-expanded');
	if(dropdown === 'false') {
		dropdown = document.querySelector('#pp-option-list-dropdown')?.getAttribute('aria-expanded');
		showOptionDropList();
	} else {
		dropdown = document.querySelector('#pp-option-list-dropdown')?.getAttribute('aria-expanded');
		hideOptionDropList();
	}
}

function showOptionDropList() {
	document.querySelector('#pp-option-list-dropdown')?.setAttribute('aria-expanded', 'true');
	document.querySelector('.pp-up-icon.pp-summary-option-icon')?.classList.remove('hide');
	document.querySelector('.pp-down-icon.pp-summary-option-icon')?.classList.add('hide');
	document.querySelector('#list-summary')?.classList.add('pp-option-summary-contents-opened');
}

function hideOptionDropList() {
	document.querySelector('#pp-option-list-dropdown')?.setAttribute('aria-expanded', 'false');
	document.querySelector('.pp-up-icon.pp-summary-option-icon')?.classList.add('hide');
	document.querySelector('.pp-down-icon.pp-summary-option-icon')?.classList.remove('hide');
	document.querySelector('#list-summary')?.classList.remove('pp-option-summary-contents-opened');
}

function dragOptionRow(event) {
	const target = event.target;

	if(!target) {
		return;
	}

	if(target.closest('.pp-draggable-icon-option')) {
		const row = target.closest('.list-option');
		row.setAttribute('draggable', true);
	}
}

function stopDraggingOptionRow(event) {
	event.preventDefault();
	const currentRow = document.querySelector('.list-option[draggable=true]');
	const targetRow = event.target.closest('.list-option');
	const all = Array.from(document.querySelectorAll('.list-option'));
	const currentRowIndex = all.indexOf(currentRow);
	const targetRowIndex = all.indexOf(targetRow);
	if(currentRowIndex !== targetRowIndex) {
		currentRow.remove();
		targetRow.insertAdjacentElement((currentRowIndex - targetRowIndex) > 0 ? 'beforebegin' : 'afterend', currentRow);
	}
	document.querySelectorAll('.list-option').forEach((row) => {
		row.setAttribute('draggable', false);
	})
}

function showOptionList(event) {
	if (event.target !== document.querySelector('select#field_type.input-box')) {
		return;
	}

	const optionListSummary = document.querySelector('#option-list-summary');
	const options = document.querySelector('#list-item');

	if (event.target.value === 'select' || event.target.value === 'radio') {
		optionListSummary.classList.remove('hide');
		document.querySelector("#field_default_box.input-field").classList.add('hide');
		if (options.children.length === 0) {
			addNewOptionRow(options, true, options.children.length);
		}
	} else {
		optionListSummary.classList.add('hide');
		document.querySelector("#field_default_box.input-field").classList.remove('hide');
		if (options.children.length > 0) {
			while (options.firstChild) {
				options.firstChild.remove();
			}
		}
	}
}

function addNewOptionRow(target, endOfContainer = false, row, value = '', name = '') {
	const newRow = `
	<div class="flex list-option" draggable="false">
		<div class="flex pp-w-23 p-025">
			<i class="dragable-icon pp-draggable-icon-option pp-w-50" aria-hidden="true"></i>
			<button type="button" class="p-05 pp-w-50 add-option button-secondary" title="Add new option row">
				<i 
					class="pp-option-dropdown-box-icon pp-add-remove-option-icon pp-add-option-row pp-w-50" 
					aria-hidden="true"
				>
				</i>
			</button>
		</div>
		<div class="flex pp-w-33 p-025">
			<input id="option-name-row${row}" type="text" name="option[name][]" placeholder=" " class="pp-option-input-box pp-b-radius-05 p-05 pp-w-100" value="${name}">
			<label for="option-name-row${row}" class="form-label pp-option-label">Option Text</label>
		</div>
		<div class="flex pp-w-33 p-025">
			<input id="option-value-row${row}" type="text" name="option[value][]" placeholder=" " class="pp-option-input-box pp-b-radius-05 p-05 pp-w-100" value="${value}">
			<label for="option-value-row${row}" class="form-label pp-option-label">Option Value</label>		
		</div>
		<div class="flex pp-w-10 p-025">
			<button type="button" value="-" class="p-05 pp-w-100 remove-option button-secondary" title="Remove row">
				<i 
				class="pp-option-dropdown-box-icon pp-add-remove-option-icon pp-remove-option-row pp-w-50" 
				aria-hidden="true"
				>
				</i>
			</button>
		</div>
	</div>
	`;

	target.insertAdjacentHTML(endOfContainer ? 'beforeend' : 'afterend', newRow);
}

function addOptionRow(event) {
	const target = event.target;

	if (!target) {
		return;
	}

	if(target.closest('.add-option')) {
		addNewOptionRow(target.closest('.list-option'), false ,document.querySelector('#list-item').children.length);
	}
}

function deleteOptionRow(event) {
	const target = event.target;

	if (!target) {
		return;
	} 
	
	const options = document.querySelector('#list-item');
	if(target.closest('.remove-option') && options.children.length > 1) {
		target.closest('.list-option').remove();
	}
}

function enableField() {
	const enableButtonField = document.querySelectorAll(
		'#field-table .enable-button',
	);
	for (const button of enableButtonField) {
		button.addEventListener('click', () => {
			disableOrEnable('yes');
		});
	}
}

function disableField() {
	const disableFieldButton = document.querySelectorAll(
		'#field-table .disable-button',
	);
	for (const button of disableFieldButton) {
		button.addEventListener('click', () => {
			disableOrEnable('');
		});
	}
}

function disableOrEnable(value) {
	for (const $input of document.querySelectorAll(
		'#field-table tbody input[type=checkbox]:checked',
	)) {
		const doc = document.querySelector(
			'#field-table tbody #field_' + $input.value + '.th_field_enable',
		);
		doc.innerHTML = value === 'yes' ? '&#10003;' : '-';
		const doc2 = document.querySelector(
			'#field-table tbody .field_' + $input.value + '#field_enable' + $input.id,
		);
		doc2.value = value;
		const row = document.querySelector(
			'#field-table tbody .row_' + $input.value,
		);
		if (value) {
			row.classList.remove('row-disabled');
		} else {
			row.classList.add('row-disabled');
		}
	}
}

function removeField() {
	const removeFieldButton = document.querySelectorAll(
		'#field-table .remove-button',
	);
	for (const button of removeFieldButton) {
		button.addEventListener('click', removeSelectedField);
	}

	function removeSelectedField() {
		for (const $input of document.querySelectorAll(
			'#field-table tbody input[type=checkbox]:checked',
		)) {
			const doc = document.querySelectorAll(
				'#field-table tbody .field_' + $input.value,
			);
			Array.prototype.forEach.call(doc, node => {
				node.remove();
			});
			const row = document.querySelector(
				'#field-table tbody .row_' + $input.value,
			);
			row.classList.add('row-removed');
		}
	}
}

function selectAllCheckbox() {
	const selectAllcheckbox = document.querySelectorAll(
		'#field-table .select-all',
	);
	for (const selectAll of selectAllcheckbox) {
		selectAll.addEventListener('change', event => {
			for (const checkbox of document.querySelectorAll(
				'#field-table input[type=checkbox]',
			)) {
				if (checkbox.checked === event.target.checked) {
					continue;
				}

				checkbox.checked = event.target.checked ? true : !checkbox.checked;
			}
		});
	}
}

/**
 * This method inserts the current field data into the modal that is to be updated.
 *
 * @param rawData the field data that is to be updated in raw JSON format.
 */
function insertEditData(rawData) {
	try {
		const data = JSON.parse(rawData);

		document.querySelector('#modal-content #field_type').value = data.type_list;
		document.querySelector('#modal-content #field_name').value
			= data.field_name;
		document.querySelector('#modal-content #field_label').value
			= data.field_label;
		document.querySelector('#modal-content #field_default').value
			= data.field_default;
		document.querySelector('#modal-content #field_required').checked = Boolean(
			data.field_required,
		);
		document.querySelector('#modal-content #field_enable').checked = Boolean(
			data.field_enable,
		);
		// For future function use.
		// document.querySelector('#modal-content #field_display_email').checked
		// 	= Boolean(data.field_display_email);
		// document.querySelector(
		// 	'#modal-content #field_display_order_details',
		// ).checked = Boolean(data.field_display_order_details);
		if(data.option && document.querySelector('#modal-content #field_type').value === 'select' 
		|| document.querySelector('#modal-content #field_type').value === 'radio') {
			const optionListSummary = document.querySelector('#option-list-summary');
			const options = document.querySelector('#list-item');

			document.querySelector("#field_default_box.input-field").classList.add('hide');

			optionListSummary.classList.remove('hide');
			let rowNum = 0;
			for(const value in data.option) {
				addNewOptionRow(options, true, rowNum, data.option[value][0], data.option[value][1]);
				rowNum++;
			}
		}

		document
			.querySelector('#modal-content #field-info')
			.insertAdjacentHTML(
				'beforeend',
				`<input type="hidden" name="edit-row" value="${data.row}"/>`,
			);
	} catch (error) {
		console.log(error);
	}
}

/**
 * Hides the modal and resets the form.
 * @param {object} event
 */
function hideAddFieldModal(event) {
	if (
		!event.target.id
		|| (event.target.id !== 'ppModal' && event.target.id !== 'close')
	) {
		return;
	}

	document.querySelector('#modal-content #field_type').value = 'text';
	document.querySelector('#modal-content #field_name').value = 'additional_';
	document.querySelector('#modal-content #field_label').value = '';
	document.querySelector('#modal-content #field_default').value = '';
	document.querySelector('#modal-content #field_required').checked = false;
	document.querySelector('#modal-content #field_enable').checked = false;
	// Future uses.
	// document.querySelector('#modal-content #field_display_email').checked = false;
	// document.querySelector('#modal-content #field_display_order_details').checked = false;
	if (document.querySelector('#modal-content #field-info input[type=hidden]')) {
		const hidden = document.querySelector(
			'#modal-content #field-info input[type=hidden]',
		);
		hidden.remove();
	}

	const options = document.querySelector('#list-item');
	const optionListSummary = document.querySelector('#option-list-summary');

	optionListSummary.classList.add('hide');

	document.querySelector('#list-summary')?.classList.remove('pp-option-summary-contents-opened');
	document.querySelector('#pp-option-list-dropdown')?.setAttribute('aria-expanded', 'false');
	document.querySelector('.pp-up-icon.pp-summary-option-icon')?.classList.add('hide');
	document.querySelector('.pp-down-icon.pp-summary-option-icon')?.classList.remove('hide');

	if (options.children.length > 0) {
		while (options.firstChild) {
			options.firstChild.remove();
		}
	}

	if (event.target.id === 'close') {
		const modal = document.querySelector('#ppModal');
		modal.style.display = 'none';
		return;
	}

	event.target.style.display = 'none';
}
