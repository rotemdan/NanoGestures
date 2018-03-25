init();
let platformInfo;

async function init() {
	//await extensionStorage.clear();

	// Ensure relevant browser settings are set
	if (browser.browserSettings && browser.browserSettings.contextMenuShowEvent) {
		await browser.browserSettings.contextMenuShowEvent.set({ value: "mouseup" });
	}

	// Ensure options are initialized
	await getOptions();

	// Cache platform info
	platformInfo = await browser.runtime.getPlatformInfo();

	// Add message listener
	browser.runtime.onMessage.addListener(onMessage);
}

let ctrlKeyDown = false;

async function onMessage(message, sender) {
	switch (message.type) {
		case "getOptions": {
			return await getOptions();
		}

		case "setOptions": {
			await setOptions(message.data);
			return;
		}

		case "closeCurrentTab": {
			const currentWindowInfo = await browser.windows.getCurrent();

			if (currentWindowInfo) {
				const currentTabInfo = await browser.tabs.query({ active: true, windowId: currentWindowInfo.id });

				if (currentTabInfo.length > 0) {
					await browser.tabs.remove(currentTabInfo[0].id);
				}
			}
			return;
		}

		case "createNewTab": {
			await browser.tabs.create({});
			return;
		}

		case "reloadCurrentTab": {
			await browser.tabs.reload();
			return;
		}

		case "activateLeftTab": {
			const currentWindowInfo = await browser.windows.getCurrent();

			if (currentWindowInfo) {
				const currentTabInfo = (await browser.tabs.query({ active: true, windowId: currentWindowInfo.id }))[0];

				if (currentTabInfo) {
					for (let leftTabIndex = currentTabInfo.index - 1; leftTabIndex >= 0; leftTabIndex--) {
						const leftTabInfo = (await browser.tabs.query({ windowId: currentWindowInfo.id, index: leftTabIndex }))[0];

						if (!leftTabInfo) {
							break;
						}

						if (message.data.skipTabsWithSpecialPages && !/^https?:\/\//.test(leftTabInfo.url)) {
							continue;
						}

						await browser.tabs.update(leftTabInfo.id, { active: true });

						break;
					}
				}
			}

			return;
		}

		case "activateRightTab": {
			const currentWindowInfo = await browser.windows.getCurrent();

			if (currentWindowInfo) {
				const currentTabInfo = (await browser.tabs.query({ active: true, windowId: currentWindowInfo.id }))[0];

				if (currentTabInfo) {
					for (let rightTabIndex = currentTabInfo.index + 1; ; rightTabIndex++) {
						const rightTabInfo = (await browser.tabs.query({ windowId: currentWindowInfo.id, index: rightTabIndex }))[0];

						if (!rightTabInfo) {
							break;
						}

						if (message.data.skipTabsWithSpecialPages && !/^https?:\/\//.test(rightTabInfo.url)) {
							continue;
						}

						await browser.tabs.update(rightTabInfo.id, { active: true });

						break;
					}
				}
			}

			return;
		}

		case "undoCloseTab": {
			const currentWindowInfo = await browser.windows.getCurrent();

			if (currentWindowInfo) {
				const recentlyClosedSessions = await browser.sessions.getRecentlyClosed();
				const filteredSessions = recentlyClosedSessions.filter((session) => {
					return session.tab != null && (session.tab.windowId === 0 || session.tab.windowId === currentWindowInfo.id);
				});

				filteredSessions.sort((s1, s2) => s2.lastModified - s1.lastModified);

				if (filteredSessions.length > 0) {
					await browser.sessions.restore(filteredSessions[0].tab.sessionId);
				}
			}

			return;
		}

		case "getCtrlKeyState": {
			return ctrlKeyDown;
		}

		case "setCtrlKeyState": {
			ctrlKeyDown = message.data;
			return;
		}

		case "getPlatformInfo": {
			return platformInfo;
		}

	}
}

async function getOptions() {
	const defaultOptions = {
		leftEnabled: true,
		rightEnabled: true,
		upEnabled: true,
		downEnabled: true,

		ctrlLeftEnabled: true,
		ctrlRightEnabled: true,
		ctrlUpEnabled: true,
		ctrlDownEnabled: true,

		leftAction: 'navigateBack',
		rightAction: 'navigateForward',
		upAction: 'createNewTab',
		downAction: 'reload',

		ctrlLeftAction: 'activateLeftTab',
		ctrlRightAction: 'activateRightTab',
		ctrlUpAction: 'undoCloseTab',
		ctrlDownAction: 'closeCurrentTab',

		minDelta: 4
	}

	const options = (await extensionStorage.get('options')).options || {};

	let hadMissingOption = false;
	for (const propertyName in defaultOptions) {
		if (options[propertyName] == null) {
			hadMissingOption = true;
			options[propertyName] = defaultOptions[propertyName];
		}
	}

	if (hadMissingOption) {
		await setOptions(options);
	}

	return options;
}

async function setOptions(newOptions) {
	await extensionStorage.set({ options: newOptions });
	await broadcastMessageToContentScripts({ type: 'optionsUpdated', data: newOptions });
}

async function broadcastMessageToContentScripts(message) {
	const tabs = await browser.tabs.query({ windowType: "normal" });

	for (tab of tabs) {
		if (/^https?:\/\//.test(tab.url)) {
			browser.tabs.sendMessage(tab.id, message);
		}
	}
}
