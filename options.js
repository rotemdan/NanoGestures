document.addEventListener("DOMContentLoaded", init);

async function init() {
	const options = await getOptions();

	for (const actionSelectionElement of document.querySelectorAll('.action-selection')) {
		actionSelectionElement.innerHTML = `
			<option value="none">do nothing</option>
			<option value="navigateBack">navigate back</option>
			<option value="navigateForward">navigate forward</option>
			<option value="reload">reload current page</option>
			<option value="createNewTab">create a new tab</option>
			<option value="closeCurrentTab">close current tab</option>
			<option value="undoCloseTab">restore last closed tab</option>
			<option value="activateLeftTab">switch to left tab</option>
			<option value="activateLeftTabSkipSpecial">switch to left tab (skip special pages)</option>
			<option value="activateRightTab">switch to right tab</option>
			<option value="activateRightTabSkipSpecial">switch to right tab (skip special pages)</option>`
	}

	const getElementById = (id) => document.getElementById(id);

	for (optionName in options) {
		if (optionName.endsWith('Enabled')) {
			getElementById(optionName).checked = options[optionName];
		} else if (optionName.endsWith('Action') || optionName === 'minDelta') {
			getElementById(optionName).value = options[optionName];
		}
	}

	getElementById('minDelta-display-value').textContent = options.minDelta + "px";

	function updateActivationForCheckboxElement(checkboxElement) {
		if (checkboxElement.classList.contains('enableGestureCheckbox')) {
			const selectElement = document.querySelector(`label[for="${checkboxElement.id}"] select`);

			if (selectElement) {
				selectElement.disabled = !checkboxElement.checked;
			}
		}
	}

	for (const checkboxElement of document.querySelectorAll('input[type="checkbox"]')) {
		checkboxElement.onchange = async function (event) {
			const targetElement = event.target;
			updateActivationForCheckboxElement(targetElement);
			options[targetElement.id] = targetElement.checked;
			await setOptions(options);

		}

		updateActivationForCheckboxElement(checkboxElement);
	}

	for (const selectElement of document.querySelectorAll('select')) {
		selectElement.onchange = async function (event) {
			const targetElement = event.target;
			options[targetElement.id] = targetElement.value;
			await setOptions(options);
		}
	}

	getElementById('minDelta').oninput = (event) => {
		getElementById('minDelta-display-value').textContent = event.target.value + "px";
	}

	getElementById('minDelta').onchange = async (event) => {
		options.minDelta = event.target.value;
		await setOptions(options);
	}
}
