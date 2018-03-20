let options;

init();

async function init() {
	options = await extensionStorage.get(["leftEnabled", "rightEnabled", "upEnabled", "downEnabled", "minDelta"]);

	window.addEventListener('mousedown', onMouseDown, true);
	window.addEventListener('pageshow', onPageShow, true);
	window.addEventListener('pagehide', onPageHide, true);
}

// Event handler: Mouse button pressed
function onMouseDown(mouseDownEvent) {
	if (mouseDownEvent.button != 2) {
		return;
	}

	log("Right mouse down event triggered");

	const startX = mouseDownEvent.pageX; // Gesture start X coordinate
	const startY = mouseDownEvent.pageY; // Gesture start Y coordinate

	window.addEventListener('mouseup', onMouseUp, true);
	window.addEventListener('contextmenu', onContextMenu, true);
	window.addEventListener('click', onClick, true);

	let rightMouseUpTriggered = false;
	let contextMenuTriggered = false;
	let contextMenuEventObject = undefined;
	let gestureDetected = false;

	async function onMouseUp(event) {
		if (event.button != 2) {
			return;
		}

		window.removeEventListener('mouseup', onMouseUp, true);
		log("Right mouse up event triggered.");
		const contextMenuTriggeredBeforeMouseUp = contextMenuTriggered;
		rightMouseUpTriggered = true;

		// Calculate distance of movement
		const deltaX = event.pageX - startX;
		const absDeltaX = Math.abs(deltaX);

		const deltaY = event.pageY - startY;
		const absDeltaY = Math.abs(deltaY);

		log(`Delta X: ${deltaX}, Delta Y: ${deltaY}`)

		const minDelta = options.minDelta;
		gestureDetected = absDeltaX >= minDelta || absDeltaY >= minDelta;

		// If a gesture was detected
		if (gestureDetected) {
			event.preventDefault();
			event.stopImmediatePropagation();

			// Determine type of gesture considering minimum distance
			const deltaYToXRatio = absDeltaY / absDeltaX;

			if (deltaYToXRatio <= 1) {
				if (options.leftEnabled && deltaX < minDelta * -1) {
					log('Left gesture detected')
					window.history.back();
				} else if (options.rightEnabled && deltaX >= minDelta) {
					log('Right gesture detected')
					window.history.forward();
				}
			} else {
				if (options.upEnabled && deltaY < minDelta * -1) {
					log('Up gesture detected')
					await browser.runtime.sendMessage({ operation: 'createNewTab' });
				} else if (options.downEnabled && deltaY >= minDelta) {
					log('Down gesture detected')
					if (window.self === window.top) {
						window.location.reload();
					} else {
						await browser.runtime.sendMessage({ operation: 'reloadCurrentTab' });
					}
				}
			}
		} else if (contextMenuTriggeredBeforeMouseUp) {
			log('Console menu was suppressed as it triggered before mouseUp but eventually no gesture was detected')
			/*
			log(contextMenuEventObject);
			const simulatedContextMenuEvent = new MouseEvent('contextmenu', contextMenuEventObject);
			log(simulatedContextMenuEvent);
			contextMenuEventObject.dispatchEvent(simulatedContextMenuEvent);
			*/
		}
	}

	// Event handler: Context menu
	function onContextMenu(event) {
		window.removeEventListener('contextmenu', onContextMenu, true);
		contextMenuTriggered = true;
		contextMenuEventObject = event;

		log("Context menu event triggered.")

		if (!rightMouseUpTriggered) {
			log("Context menu supressed as mouse up event has not yet fired");
			event.preventDefault();
			event.stopImmediatePropagation();
		} else if (gestureDetected) {
			log("Context menu supressed as a gesture has been detected");
			event.preventDefault();
			event.stopImmediatePropagation();
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
			log("Right click suppreseed as a gesture has been detected");
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}
}

function onPageShow(event) {
	log("onPageShow");
}

function onPageHide(event) {
	log("onPageHide");
}
