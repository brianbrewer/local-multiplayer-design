var Main = Main || {};
(function () {
    "use strict";
    var ControllerHandler = {};

    ControllerHandler.Gamepads = [];
    ControllerHandler.ticking = false;
    ControllerHandler.ButtonsPressed = [[], [], [], []];

    ControllerHandler.init = function (fDown, fUp) {
        var supported = navigator.getGamepads ||
            !!navigator.webkitGetGamepads ||
            !!navigator.webkitGamepads;

        // Setup Handlers for "firefox"
        if (window.hasOwnProperty("GamepadEvent")) {
            window.addEventListener("gamepadconnected", ControllerHandler.onGamepadConnect, false);
            window.addEventListener("gamepaddisconnected", ControllerHandler.onGamepadDisconnect, false);
        } else {
            // Begin polling already "chrome"
            ControllerHandler.startPolling();
        }

        // Setup Button Handlers
        if (fDown) {
            ControllerHandler.onButtonDown = fDown;
        }
        if (fUp) {
            ControllerHandler.onButtonUp = fUp;
        }
    };

    ControllerHandler.onGamepadConnect = function (event) {
        // Add to list of gamepads
        ControllerHandler.Gamepads.push(event.gamepad);

        // Start polling
        ControllerHandler.startPolling();
    };

    ControllerHandler.onGamepadDisconnect = function (event) {
        var gamepad;

        for (gamepad in ControllerHandler.Gamepads) {
            if (ControllerHandler.Gamepads.hasOwnProperty(gamepad)) {
                if (ControllerHandler.Gamepads[gamepad].index === event.gamepad.index) {
                    ControllerHandler.Gamepads.splice(gamepad, 1);
                    break;
                }
            }
        }
    };

    ControllerHandler.startPolling = function () {
        // Make sure only to have one loop
        if (!ControllerHandler.ticking) {
            ControllerHandler.ticking = true;
            ControllerHandler.tick();
        }
    };

    ControllerHandler.stopPolling = function () {
        ControllerHandler.ticking = false;
    };

    ControllerHandler.tick = function () {
        // Poll Gamepads / Controllers
        var rawGamepads,
            gamepadsChanged,
            i,
            j,
            readout = false,
            outputString = "";

        rawGamepads =
            (navigator.getGamepads && navigator.getGamepads()) ||
            (navigator.webkitGetGamepads && navigator.webkitGetGamepads());

        // Iterate through raw data to normalise changes
        if (rawGamepads) {
            ControllerHandler.Gamepads = [];
            for (i = 0; i < rawGamepads.length; i += 1) {

                if (rawGamepads[i]) {
                    ControllerHandler.Gamepads.push(rawGamepads[i]);
                }
            }
        }

        // Check for button presses
        for (i = 0; i < ControllerHandler.Gamepads.length; i += 1) {
            for (j = 0; j < ControllerHandler.Gamepads[i].buttons.length; j += 1) {
                if (ControllerHandler.Gamepads[i].buttons[j].pressed && !ControllerHandler.ButtonsPressed[i][j]) {
                    ControllerHandler.ButtonsPressed[i][j] = true;
                    if (ControllerHandler.onButtonDown) {
                        ControllerHandler.onButtonDown(i, j);
                    }
                }

                if (!ControllerHandler.Gamepads[i].buttons[j].pressed && ControllerHandler.ButtonsPressed[i][j]) {
                    ControllerHandler.ButtonsPressed[i][j] = false;
                    if (ControllerHandler.onButtonUp) {
                        ControllerHandler.onButtonUp(i, j);
                    }
                }
            }
        }

        // Output
        if (readout) {
            for (i = 0; i < ControllerHandler.Gamepads.length; i += 1) {
                outputString += "Controller " + i + " " + ControllerHandler.Gamepads[i].id + "<br>\n";

                // Buttons
                for (j = 0; j < ControllerHandler.Gamepads[i].buttons.length; j += 1) {
                    outputString += "Button " + j + ": " + ControllerHandler.Gamepads[i].buttons[j].value + "<br>\n";
                }

                // Axis
                for (j = 0; j < ControllerHandler.Gamepads[i].axes.length; j += 1) {
                    outputString += "Axis " + j + ": " + ControllerHandler.Gamepads[i].axes[j] + "<br>\n";
                }

            }
            document.getElementById("output").innerHTML = outputString;
        }

        // Start next tick
        if (ControllerHandler.ticking) {
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(ControllerHandler.tick);
            } else if (window.mozRequestAnimationFrame) {
                window.mozRequestAnimationFrame(ControllerHandler.tick);
            } else if (window.webkitRequestAnimationFrame) {
                window.webkitRequestAnimationFrame(ControllerHandler.tick);
            }
        }
    };

    Main.ControllerHandler = Main.ControllerHandler || ControllerHandler;
}());
