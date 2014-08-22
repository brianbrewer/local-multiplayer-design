var Main = Main || {};
(function () {
    "use strict";
	var InputHandler = {},
		keysPressed = [];

	// Handle Keyboard
	InputHandler.AttachKeys = function (element, fDown, fUp) {
		element.addEventListener("keydown", function (e) {
			if (!keysPressed[e.keyCode] || false) {
				keysPressed[e.keyCode] = true;
				if (fDown) {
					fDown(e.keyCode);
                }
			}
		});
		element.addEventListener("keyup", function (e) {
			if (keysPressed[e.keyCode]) {
				keysPressed[e.keyCode] = false;
				if (fUp) {
					fUp(e.keyCode);
                }
			}
		});
	};

	InputHandler.AttachMouse = function (element, fDown, fMove, fUp) {
		element.addEventListener("mousedown", function (e) {
			if (fDown) {
                fDown(e);
            }
		});
		element.addEventListener("mouseup", function (e) {
			if (fUp) {
				fUp(e);
            }
		});
		element.addEventListener("mousemove", function (e) {
			if (fMove) {
				fMove(e);
            }
		});
	};

    Main.InputHandler = Main.InputHandler || InputHandler;
	InputHandler.KeysPressed = keysPressed;
}());