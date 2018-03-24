const debugModeEnabled = true;
const extensionManifest = browser.runtime.getManifest();

function log(...args) {
	if (debugModeEnabled) {
		console.log(`[${extensionManifest.name}]`, ...args);
	}
}

const extensionSyncStorage = browser.storage.sync;
const extensionLocalStorage = browser.storage.local;
const extensionStorage = extensionSyncStorage;

async function sendRequest(type, data = undefined) {
	return await browser.runtime.sendMessage({ type, data });
}

async function getOptions() {
	return await sendRequest('getOptions');
}

async function setOptions(newOptions) {
	await sendRequest('setOptions', newOptions);
}
