let options;

init();

async function init() {
	options = await extensionStorage.get(["leftEnabled", "rightEnabled", "upEnabled", "downEnabled", "minDelta"]);

	window.addEventListener('mousedown', onMouseDown, true);

	window.addEventListener('keydown', onKeyDown, true);
	window.addEventListener('contextmenu', detectOrphanContextMenu, true);
}

let withinARightClickSequence = false;

// Event handler: Mouse button pressed
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
			log('Context menu was suppressed as it triggered before mouseUp but eventually no gesture was detected')
		}

		if (contextMenuTriggeredBeforeMouseUp) {
			withinARightClickSequence = false;
		}
	}

	// Event handler: Context menu
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
			log("Right click suppressed as a gesture has been detected");
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}
}

let lastKeyPressed = -1;

function onKeyDown(event) {
	lastKeyPressed = event.keyCode;
}

// Event handler to detect context menu not originating from a right click sequence
// nor a relevant key press
function detectOrphanContextMenu(event) {
	if (!withinARightClickSequence && lastKeyPressed != 93) {
		log("Orphan context menu event suppressed");
		event.preventDefault();
		event.stopImmediatePropagation();
	}
}
