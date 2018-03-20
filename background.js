async function onInstalled(details) {
	const { leftEnabled = true, rightEnabled = true, upEnabled = true, downEnabled = true, minDelta = 4 } = await extensionStorage.get(["leftEnabled", "rightEnabled", "upEnabled", "downEnabled", "minDelta"]);
	await extensionStorage.set({ leftEnabled, rightEnabled, upEnabled, downEnabled, minDelta });

	if (browser.browserSettings && browser.browserSettings.contextMenuShowEvent) {
		await browser.browserSettings.contextMenuShowEvent.set({ value: "mouseup" });
	}
}

async function onMessage(request, sender, sendResponse) {
	switch (request.operation) {
		case "createNewTab": {
			await browser.tabs.create({});
			break;
		}

		case "reloadCurrentTab": {
			await browser.tabs.reload();
			break;
		}
	}
}

browser.runtime.onInstalled.addListener(onInstalled);
browser.runtime.onMessage.addListener(onMessage);
