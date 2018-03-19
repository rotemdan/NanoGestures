let options;
let startX = -1; // Gesture start X coordinate
let startY = -1; // Gesture start Y coordinate

let suppressContextMenu = false; // Suppress context menu after gesture
let rightMouseUpTriggeredOnce = false;

// Event handler: Mouse button pressed
function onMouseDown(event) {
	// If right mouse button pressed
	if (event.button == 2) {
		log("onMouseDown: right");

		// Store start coordinates
		startX = event.pageX;
		startY = event.pageY;
	}
}

// Event handler: Mouse button released
async function onMouseUp(event) {
	// If right mouse button released
	if (event.button == 2) {
		rightMouseUpTriggeredOnce = true;

		log("onMouseUp: right");

		if (startX == -1 || startY == -1) {
			suppressContextMenu = true;
			return;
		}

		// Calculate distance of movement
		const deltaX = event.pageX - startX;
		const absDeltaX = Math.abs(deltaX);

		const deltaY = event.pageY - startY;
		const absDeltaY = Math.abs(deltaY);

		const minDelta = options.minDelta;

		// Determine type of gesture considering minimum distance
		if (absDeltaX >= minDelta || absDeltaY >= minDelta) {
			suppressContextMenu = true;
			event.preventDefault();
			event.stopImmediatePropagation();

			const deltaYToXRatio = absDeltaY / absDeltaX;
			log("deltaYToXRatio:", deltaYToXRatio);

			if (deltaYToXRatio <= 1) {
				if (options.leftEnabled && deltaX < minDelta * -1) {
					window.history.back();
				} else if (options.rightEnabled && deltaX >= minDelta) {
					window.history.forward();
				}
			} else {
				if (options.upEnabled && deltaY < minDelta * -1) {
					await browser.runtime.sendMessage({ operation: 'createNewTab' });
				} else if (options.downEnabled && deltaY >= minDelta) {
					if (window.self === window.top) {
						window.location.reload();
					} else {
						await browser.runtime.sendMessage({ operation: 'reloadCurrentTab' });
					}
				}
			}
		} else {
			suppressContextMenu = false;
		}

		startX = -1;
		startY = -1;
	}
}

// Event handler: Mouse button pressed
function onClick(event) {
	if (event.button == 2) {
		log("rightClick");

		if (suppressContextMenu) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}
}

let lastKeyPressed = -1;

function onKeyDown(event) {
	//log("onKeyDown");
	lastKeyPressed = event.keyCode;
}

// Event handler: Context menu
function onContextMenu(event) {
	log("onContextMenu. suppressContextMenu:", suppressContextMenu, ", rightMouseUpTriggeredOnce:", rightMouseUpTriggeredOnce);

	if (lastKeyPressed === 93) { // If the 'menu' key was pressed, don't suppress
		lastKeyPressed = -1;
		return;
	}

	if (!rightMouseUpTriggeredOnce) { // Catch orphan contextmenu events
		log("Context menu will be suppressed due to contextmenu event triggered without at least one right mouseUp")
		suppressContextMenu = true;
	}

	// Valid gesture detected: Suppress context menu
	if (suppressContextMenu) {
		log("Context menu suppressed")
		event.preventDefault();
		event.stopImmediatePropagation();
		suppressContextMenu = false;
	}
}

function onPageShow(event) {
	log("onPageShow");
	rightMouseUpTriggeredOnce = false;
}

function onPageHide(event) {
	log("onPageHide");
	rightMouseUpTriggeredOnce = false;
}

async function init() {
	options = await extensionStorage.get(["leftEnabled", "rightEnabled", "upEnabled", "downEnabled", "minDelta"]);

	window.addEventListener('mousedown', onMouseDown, true);
	window.addEventListener('mouseup', onMouseUp, true);
	window.addEventListener('click', onClick, true);
	window.addEventListener("keydown", onKeyDown, true);
	window.addEventListener('contextmenu', onContextMenu, true);
	window.addEventListener('pageshow', onPageShow, true);
	window.addEventListener('pagehide', onPageHide, true);
}

init();
