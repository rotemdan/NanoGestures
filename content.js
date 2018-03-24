let options;
let platformInfo;

init();

async function init() {
	// Get options
	// options = await getOptions();
	// (faster method -- assumes options are initialized when the extension starts):
	options = (await extensionStorage.get('options')).options;

	if (!options) {
		log('No extension options found. Aborting');
		return;
	}

	// Listen to option updates
	browser.runtime.onMessage.addListener((message, sender) => {
		if (message.type = 'optionsUpdated') {
			options = message.data;
		}
	});

	platformInfo = await sendRequest('getPlatformInfo');

	// Add mousedown event handler
	window.addEventListener('mousedown', onMouseDown, true);

	// Add auxilary handler to detect orphan context menu events
	// (context menu event that appears outside of a right click event sequence)
	window.addEventListener('contextmenu', detectOrphanContextMenu, true);

	// Add handler to track modifier key states and menu key presses
	window.addEventListener('keydown', onKeyDown, true);
	window.addEventListener('keyup', onKeyUp, true);

	// Add handler to reset modifier key states when window is focused
	window.addEventListener("focus", onWindowFocused, true);
}

let withinARightClickSequence = false;

// Event handler: mouse pressed down
function onMouseDown(mouseDownEvent) {
	if (mouseDownEvent.button != 2) {
		return;
	}

	log("Right mouse down event triggered");

	withinARightClickSequence = true;
	let rightMouseUpTriggered = false;
	let contextMenuTriggered = false;
	let gestureDetected = false;

	const startX = mouseDownEvent.pageX; // Gesture start X coordinate
	const startY = mouseDownEvent.pageY; // Gesture start Y coordinate

	window.addEventListener('mouseup', onMouseUp, true);
	window.addEventListener('contextmenu', onContextMenu, true);
	window.addEventListener('click', onClick, true);

	async function onMouseUp(event) {
		if (event.button != 2) {
			return;
		}

		log("Right mouse up event triggered.");
		window.removeEventListener('mouseup', onMouseUp, true);

		const contextMenuTriggeredBeforeMouseUp = contextMenuTriggered;
		rightMouseUpTriggered = true;

		// Calculate distance of cursor movement since the mousedown event
		const deltaX = event.pageX - startX;
		const absDeltaX = Math.abs(deltaX);

		const deltaY = event.pageY - startY;
		const absDeltaY = Math.abs(deltaY);

		log(`Delta X: ${deltaX}, Delta Y: ${deltaY}`)

		// Determine if the movement was large enough to be identified as a gesture
		const minDelta = options.minDelta;
		gestureDetected = absDeltaX >= minDelta || absDeltaY >= minDelta;

		// If a gesture was detected
		if (gestureDetected) {
			// Suppress all further event handlers and default behaviors for the mouseup event
			event.preventDefault();
			event.stopImmediatePropagation();

			// Determine gesture type and handle it
			const deltaYToXRatio = absDeltaY / absDeltaX;

			if (deltaYToXRatio <= 1) {
				if (options.leftEnabled && deltaX < minDelta * -1) {
					await handleGesture('left');
				} else if (options.rightEnabled && deltaX >= minDelta) {
					await handleGesture('right');
				}
			} else {
				if (options.upEnabled && deltaY < minDelta * -1) {
					await handleGesture('up');
				} else if (options.downEnabled && deltaY >= minDelta) {
					await handleGesture('down');
				}
			}
		} else if (contextMenuTriggeredBeforeMouseUp) {
			// This scenario might happen in macOS/Linux, in which by default contextmenu event
			// is triggered before the mouseup event.
			// (setting contextMenuShowEvent to 'mouseup' should avoid it)
			log('Context menu was suppressed as it triggered before mouseUp but eventually no gesture was detected')
		}

		if (contextMenuTriggeredBeforeMouseUp) {
			withinARightClickSequence = false;
		}
	}

	// Event handler: context menu
	function onContextMenu(event) {
		window.removeEventListener('contextmenu', onContextMenu, true);
		contextMenuTriggered = true;

		log("Context menu event triggered.")

		if (!rightMouseUpTriggered) {
			log("Context menu suppressed as mouse up event has not yet fired");
			event.preventDefault();
			event.stopImmediatePropagation();
		} else if (gestureDetected) {
			log("Context menu suppressed as a gesture has been detected");
			event.preventDefault();
			event.stopImmediatePropagation();
		}

		if (rightMouseUpTriggered) {
			withinARightClickSequence = false;
		}
	}

	// Event handler: Mouse button pressed
	function onClick(event) {
		if (event.button != 2) {
			return
		}

		window.removeEventListener('click', onClick, true);

		log("Right click event triggered");

		if (gestureDetected) {
			log("Right click event suppressed as a gesture has been detected");
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}
}

let lastKeyPressed = -1;
let ctrlKeyPressed = false;

async function onKeyDown(event) {
	lastKeyPressed = event.keyCode;

	if (event.key == "Control") {
		ctrlKeyPressed = true;
		await sendRequest("setCtrlKeyState", true);
	}
}

async function onKeyUp(event) {
	if (event.key == "Control") {
		ctrlKeyPressed = false;
		await sendRequest("setCtrlKeyState", false);
	}
}

// Ensure that if the Ctrl key was release outside of any tracked pages, its state would
// default to off when focus returns. If it is still pressed when focus returned it should yield
// continuous keydown events.
function onWindowFocused(event) {
	ctrlKeyPressed = false
}

// Event handler to detect context menu not originating from a right click sequence
// nor a relevant key press
function detectOrphanContextMenu(event) {
	if (!withinARightClickSequence) {
		if (lastKeyPressed == 93) {
			// The menu key was last pressed, so don't suppress the context menu
			lastKeyPressed = -1;
			return;
		}

		log("Orphan context menu event suppressed");
		event.preventDefault();
		event.stopImmediatePropagation();
	}
}

async function handleGesture(gesture) {
	let ctrlPressed;

	if (platformInfo.os == 'win') {
		ctrlPressed = ctrlKeyPressed;
	} else {
		ctrlPressed = await sendRequest('getCtrlKeyState');
	}

	switch (gesture) {
		case "left":
			if (ctrlPressed) {
				if (options.ctrlLeftEnabled) {
					await executeAction(options.ctrlLeftAction);
				}
			} else {
				if (options.leftEnabled) {
					await executeAction(options.leftAction);
				}
			}
			break;

		case "right":
			if (ctrlPressed) {
				if (options.ctrlRightEnabled) {
					await executeAction(options.ctrlRightAction);
				}
			} else {
				if (options.rightEnabled) {
					await executeAction(options.rightAction);
				}
			}

			break;

		case "up":
			if (ctrlPressed) {
				if (options.ctrlUpEnabled) {
					await executeAction(options.ctrlUpAction);
				}
			} else {
				if (options.upEnabled) {
					await executeAction(options.upAction);
				}
			}
			break;

		case "down":
			if (ctrlPressed) {
				if (options.ctrlDownEnabled) {
					await executeAction(options.ctrlDownAction);
				}
			} else {
				if (options.downEnabled) {
					await executeAction(options.downAction);
				}
			}
			break;
	}
}

async function executeAction(action) {
	switch (action) {
		case "navigateBack":
			window.history.back();
			break;

		case "navigateForward":
			window.history.forward();
			break;

		case "reload":
			if (window.self === window.top) {
				window.location.reload();
			} else {
				await sendRequest('reloadCurrentTab');
			}
			break;

		case "closeCurrentTab":
			await sendRequest('closeCurrentTab');
			break;

		case "createNewTab":
			await sendRequest('createNewTab');
			break;

		case "activateLeftTab":
			await sendRequest('activateLeftTab', { skipTabsWithSpecialPages: false });
			break;

		case "activateLeftTabSkipSpecial":
			await sendRequest('activateLeftTab', { skipTabsWithSpecialPages: true });
			break;

		case "activateRightTab":
			await sendRequest('activateRightTab', { skipTabsWithSpecialPages: false });
			break;

		case "activateRightTabSkipSpecial":
			await sendRequest('activateRightTab', { skipTabsWithSpecialPages: true });
			break;

		case "undoCloseTab":
			await sendRequest('undoCloseTab');
			break;
	}
}
