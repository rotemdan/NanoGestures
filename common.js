const debugModeEnabled = false;
const extensionManifest = browser.runtime.getManifest();

function log(...args) {
	if (debugModeEnabled) {
		console.log(`[${extensionManifest.name}]`, ...args);
	}
}

const extensionSyncStorage = browser.storage.sync;
const extensionLocalStorage = browser.storage.local;
const extensionStorage = extensionSyncStorage;
