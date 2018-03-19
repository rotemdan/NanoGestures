async function init() {
	const initialOptions = await extensionStorage.get(["leftEnabled", "rightEnabled", "upEnabled", "downEnabled", "minDelta"]);

	const leftEnabledCheckbox = document.getElementById("leftEnabled");
	const rightEnabledCheckbox = document.getElementById("rightEnabled");
	const upEnabledCheckbox = document.getElementById("upEnabled");
	const downEnabledCheckbox = document.getElementById("downEnabled");
	const minDeltaInput = document.getElementById("minDelta");
	const minDeltaDisplay = document.getElementById("minDeltaDisplay");

	leftEnabledCheckbox.checked = initialOptions.leftEnabled;
	rightEnabledCheckbox.checked = initialOptions.rightEnabled;
	upEnabledCheckbox.checked = initialOptions.upEnabled;
	downEnabledCheckbox.checked = initialOptions.downEnabled;
	minDeltaInput.valueAsNumber = initialOptions.minDelta;
	minDeltaDisplay.textContent = minDeltaInput.value + "px";

	leftEnabledCheckbox.onchange = async function (event) {
		await extensionStorage.set({ "leftEnabled": event.target.checked });
	}

	rightEnabledCheckbox.onchange = async function (event) {
		await extensionStorage.set({ "rightEnabled": event.target.checked });
	}

	upEnabledCheckbox.onchange = async function (event) {
		await extensionStorage.set({ "upEnabled": event.target.checked });
	}

	downEnabledCheckbox.onchange = async function (event) {
		await extensionStorage.set({ "downEnabled": event.target.checked });
	}

	async function onMinDeltaInputChanged(event) {
		minDeltaDisplay.textContent = minDeltaInput.value + "px";
		await extensionStorage.set({ "minDelta": event.target.valueAsNumber });
	}

	minDeltaInput.onchange = onMinDeltaInputChanged;
	minDeltaInput.oninput = onMinDeltaInputChanged;
}

window.onload = init;

