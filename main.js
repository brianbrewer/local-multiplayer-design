/*jslint browser: true, devel: true, todo: true*/
/*global Data, Graph, astar */
var Main = (function () {
    "use strict";

    var self = {},
        loadImages,
        colourImages,
        convertLevel,
        hexToRGB,
        drawRotatedImage,
        drawLevel,
        drawGuide,
        currentLevel,
        previousTime,
        currentTime,
        calculateGuide,
        lerp;

    self.STATIC = {
        SCREEN_WIDTH: 320,
        SCREEN_HEIGHT: 320,
        LEVEL_WIDTH: 20,
        LEVEL_HEIGHT: 20,
        TILE_WIDTH: 16,
        TILE_HEIGHT: 16
    };
    self.Images = {};
    self.Paused = false;
    self.Explosions = [];
    self.Layers = {};
    self.ItemDraw = true;
    self.Team = {
        1: {
            Colour: "#cccccc",
            Player: {
                x: 0,
                y: 0,
                r: 0
            },
            Bots: [],
            Blocks: [],
            Mines: [],
            BotTimer: 0,
            Keys: {
                PositiveX: 68,
                NegativeX: 65,
                PositiveY: 83,
                NegativeY: 87,
                Block: 81,
                Mine: 69
            }
        },
        2: {
            Colour: "#ff00ff",
            Player: {
                x: 0,
                y: 0,
                r: 0
            },
            Bots: [],
            Blocks: [],
            Mines: [],
            BotTimer: 0,
            Keys: {
                PositiveX: 72,
                NegativeX: 70,
                PositiveY: 71,
                NegativeY: 84,
                Block: 82,
                Mine: 89
            }
        },
        3: {
            Colour: "#00ffff",
            Player: {
                x: 0,
                y: 0,
                r: 0
            },
            Bots: [],
            Blocks: [],
            Mines: [],
            BotTimer: 0,
            Keys: {
                PositiveX: 76,
                NegativeX: 74,
                PositiveY: 75,
                NegativeY: 73,
                Block: 85,
                Mine: 79
            }
        },
        4: {
            Colour: "#ff8c00",
            Player: {
                x: 0,
                y: 0,
                r: 0
            },
            Bots: [],
            Blocks: [],
            Mines: [],
            BotTimer: 0,
            Keys: {
                PositiveX: 102,
                NegativeX: 100,
                PositiveY: 101,
                NegativeY: 104,
                Block: 103,
                Mine: 105
            }
        }
    };

    self.load = function () {
        // Load Images
        loadImages(self.setup);

        // Load Sound
    };

    self.setup = function () {
        var team,
            tileX,
            tileY,
            hidden,
            visibilityChange;

        // Create team coloured images
        colourImages();

        // requestAnimationFrame polyfill
        window.requestAnimFrame = (function () {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                function (callback) {
                    window.setTimeout(callback, 1000 / 60);
                };
        }());

        // Create layered canvas'
        self.Layers.Level = document.createElement("canvas");       // Hardly Ever
        self.Layers.Level.width = self.STATIC.SCREEN_WIDTH;
        self.Layers.Level.height = self.STATIC.SCREEN_HEIGHT;

        self.Layers.Items = document.createElement("canvas");       // On item use
        self.Layers.Items.width = self.STATIC.SCREEN_WIDTH;
        self.Layers.Items.height = self.STATIC.SCREEN_HEIGHT;

        self.Layers.Entities = document.createElement("canvas");    // Every Frame
        self.Layers.Entities.width = self.STATIC.SCREEN_WIDTH;
        self.Layers.Entities.height = self.STATIC.SCREEN_HEIGHT;

        self.Layers.Interface = document.createElement("canvas");   // UI Changes
        self.Layers.Interface.width = self.STATIC.SCREEN_WIDTH;
        self.Layers.Interface.height = self.STATIC.SCREEN_HEIGHT;

        // Set layer z-index
        self.Layers.Level.style.zIndex = 0;
        self.Layers.Items.style.zIndex = 1;
        self.Layers.Entities.style.zIndex = 2;
        self.Layers.Interface.style.zIndex = 3;

        // Add to Page
        document.body.appendChild(self.Layers.Level);
        document.body.appendChild(self.Layers.Items);
        document.body.appendChild(self.Layers.Entities);
        document.body.appendChild(self.Layers.Interface);

        // Get context
        self.Layers.LevelContext = self.Layers.Level.getContext("2d");
        self.Layers.ItemsContext = self.Layers.Items.getContext("2d");
        self.Layers.EntitiesContext = self.Layers.Entities.getContext("2d");
        self.Layers.InterfaceContext = self.Layers.Interface.getContext("2d");

        // Setup Pausing on change tab and other stuffs
        if (document.hidden === undefined) {
            hidden = "hidden";
            visibilityChange = "visibilitychange";
        } else if (document.mozHidden !== undefined) { // Firefox up to v17
            hidden = "mozHidden";
            visibilityChange = "mozvisibilitychange";
        } else if (document.webkitHidden !== undefined) { // Chrome up to v32, Android up to v4.4, Blackberry up to v10
            hidden = "webkitHidden";
            visibilityChange = "webkitvisibilitychange";
        }

        document.addEventListener(visibilityChange, function () {
            if (document[hidden]) {
                console.log("Pause");
                self.Paused = true;
            } else {
                console.log("Un-Pause");
                self.Paused = false;
            }
        }, false);

        // Setup Level
        currentLevel = {};
        currentLevel.Name = "LevelOne";
        currentLevel.Data = Data.Levels[currentLevel.Name];
        currentLevel.Graph = new Graph(convertLevel(currentLevel.Data));
        currentLevel.Point = {};

        // Get Team Start/Ends
        for (tileY = 0; tileY < self.STATIC.LEVEL_HEIGHT; tileY += 1) {
            for (tileX = 0; tileX < self.STATIC.LEVEL_WIDTH; tileX += 1) {
                switch (currentLevel.Data[tileY][tileX]) {
                case 2:
                    currentLevel.Point.Start1 = {x: tileX, y: tileY};
                    break;
                case 3:
                    currentLevel.Point.Start2 = {x: tileX, y: tileY};
                    break;
                case 4:
                    currentLevel.Point.Start3 = {x: tileX, y: tileY};
                    break;
                case 5:
                    currentLevel.Point.Start4 = {x: tileX, y: tileY};
                    break;
                case 6:
                    currentLevel.Point.End1 = {x: tileX, y: tileY};
                    break;
                case 7:
                    currentLevel.Point.End2 = {x: tileX, y: tileY};
                    break;
                case 8:
                    currentLevel.Point.End3 = {x: tileX, y: tileY};
                    break;
                case 9:
                    currentLevel.Point.End4 = {x: tileX, y: tileY};
                    break;
                }
            }
        }
        calculateGuide();

        // Attach InputHandler
        Main.InputHandler.AttachKeys(window, function (key) {
            if (!Main.Paused) {
                var blockX,
                    blockY,
                    botTeam,
                    i;

                for (team = 1; team <= 4; team += 1) {
                    // Place Blocks
                    if (key === Main.Team[team].Keys.Block) {
                        blockX = Math.floor(Main.Team[team].Player.y / self.STATIC.TILE_HEIGHT);
                        blockY = Math.floor(Main.Team[team].Player.x / self.STATIC.TILE_WIDTH);

                        // Place Block and add to weight graph
                        if (currentLevel.Data[blockX][blockY] === 1) {
                            Main.Team[team].Blocks.push({
                                x: blockY,
                                y: blockX
                            });
                            currentLevel.Graph.grid[blockY][blockX].weight = 0;
                        }

                        // Tell everything to update pathing
                        calculateGuide();
                        for (botTeam = 1; botTeam <= 4; botTeam += 1) {
                            for (i = 0; i < Main.Team[botTeam].Bots.length; i += 1) {
                                Main.Team[botTeam].Bots[i].rr = true;
                            }
                        }
                        self.ItemDraw = true;
                    }

                    // Place Mines
                    if (key === Main.Team[team].Keys.Mine) {
                        blockX = Math.floor(Main.Team[team].Player.y / self.STATIC.TILE_HEIGHT);
                        blockY = Math.floor(Main.Team[team].Player.x / self.STATIC.TILE_WIDTH);

                        // Create new mine object
                        if (currentLevel.Data[blockX][blockY] === 1) {
                            Main.Team[team].Mines.push({
                                x: blockY,
                                y: blockX,
                                t: 3000,
                                detonate: false
                            });
                            self.ItemDraw = true;
                        }
                    }
                }
            }
        });

        // Setup Controllers / Attach Listeners
        Main.ControllerHandler.init(function (controller, button) {
            if (!Main.Paused) {
                var blockX,
                    blockY,
                    botTeam,
                    i;

                // Place Blocks
                if (button === 0) {
                    blockX = Math.floor(Main.Team[controller + 1].Player.y / self.STATIC.TILE_HEIGHT);
                    blockY = Math.floor(Main.Team[controller + 1].Player.x / self.STATIC.TILE_WIDTH);

                    // Place Block and add to weight graph
                    if (currentLevel.Data[blockX][blockY] === 1) {
                        Main.Team[controller + 1].Blocks.push({
                            x: blockY,
                            y: blockX
                        });
                        currentLevel.Graph.grid[blockY][blockX].weight = 0;
                    }

                    // Tell everything to update pathing
                    calculateGuide();
                    for (botTeam = 1; botTeam <= 4; botTeam += 1) {
                        for (i = 0; i < Main.Team[botTeam].Bots.length; i += 1) {
                            Main.Team[botTeam].Bots[i].rr = true;
                        }
                    }

                    self.ItemDraw = true;
                }

                // Place Mines
                if (button === 1) {
                    blockX = Math.floor(Main.Team[controller + 1].Player.y / self.STATIC.TILE_HEIGHT);
                    blockY = Math.floor(Main.Team[controller + 1].Player.x / self.STATIC.TILE_WIDTH);

                    // Create new mine object
                    if (currentLevel.Data[blockX][blockY] === 1) {
                        Main.Team[controller + 1].Mines.push({
                            x: blockY,
                            y: blockX,
                            t: 3000
                        });
                        self.ItemDraw = true;
                    }
                }
            }
        });

        // Place Players
        for (team = 1; team <= 4; team += 1) {
            Main.Team[team].Player.x = Main.Team[team].Route[0].x * self.STATIC.TILE_WIDTH + self.STATIC.TILE_WIDTH / 2;
            Main.Team[team].Player.y = Main.Team[team].Route[0].y * self.STATIC.TILE_HEIGHT + self.STATIC.TILE_HEIGHT / 2;
        }

        // Draw Level (Only really once)
        drawLevel(self.Layers.LevelContext, currentLevel.Data);

        // Begin Update Loop
        previousTime = Date.now();
        window.requestAnimFrame(self.update);
    };

    self.update = function () {
        var delta,
            team,
            i,
            j,
            k,
            l,
            currentTileX,
            currentTileY,
            player,
            playerTileX,
            playerTileY,
            botTeam,
            bot,
            botTileX,
            botTileY,
            wallTileX,
            wallTileY,
            mineTileX,
            mineTileY,
            exploded,
            vx,
            vy,
            currentBlock,
            destinationXBlock,
            destinationYBlock;

        // Next Update
        window.requestAnimFrame(self.update);

        // Update Delta if not paused
        currentTime = Date.now();
        if (!self.Paused) {
            delta = currentTime - previousTime;
        }
        previousTime = currentTime;

        if (!self.Paused) {
            // Character Movement
            for (player = 1; player <= 4; player += 1) {
                vx = vy = 0;
                if (Main.ControllerHandler.Gamepads[player - 1]) {
                    // Controller
                    vx = Math.round(Main.ControllerHandler.Gamepads[player - 1].axes[0]) * 48 / 1000 * delta;
                    vy = Math.round(Main.ControllerHandler.Gamepads[player - 1].axes[1]) * 48 / 1000 * delta;
                    Main.Team[player].Player.r = 270 - Math.atan2(Main.ControllerHandler.Gamepads[player - 1].axes[0], -Main.ControllerHandler.Gamepads[player - 1].axes[1]) * 180 / Math.PI;
                } else {
                    // Keyboard
                    if (Main.InputHandler.KeysPressed[Main.Team[player].Keys.PositiveX]) {
                        vx += 1;
                    }
                    if (Main.InputHandler.KeysPressed[Main.Team[player].Keys.NegativeX]) {
                        vx -= 1;
                    }
                    if (Main.InputHandler.KeysPressed[Main.Team[player].Keys.PositiveY]) {
                        vy += 1;
                    }
                    if (Main.InputHandler.KeysPressed[Main.Team[player].Keys.NegativeY]) {
                        vy -= 1;
                    }
                }
                //Collision
                //@TODO: Take into consideration the existence of blocks from other players
                currentTileX = Math.floor(Main.Team[player].Player.x / Main.STATIC.TILE_WIDTH);
                currentTileY = Math.floor(Main.Team[player].Player.y / Main.STATIC.TILE_HEIGHT);
                playerTileX = Math.floor((Main.Team[player].Player.x + vx * 48 / 1000 * delta) / Main.STATIC.TILE_WIDTH);
                playerTileY = Math.floor((Main.Team[player].Player.y + vy * 48 / 1000 * delta) / Main.STATIC.TILE_HEIGHT);

                // Check against blocks
                currentBlock = destinationXBlock = destinationYBlock = null;
                for (j = 1; j <= 4; j += 1) {
                    for (k = 0; k < Main.Team[j].Blocks.length; k += 1) {
                        if (Main.Team[j].Blocks[k].x === playerTileX && Main.Team[j].Blocks[k].y === currentTileY) {
                            destinationXBlock = Main.Team[j].Blocks[k];
                        }
                        if (Main.Team[j].Blocks[k].x === currentTileX && Main.Team[j].Blocks[k].y === playerTileY) {
                            destinationYBlock = Main.Team[j].Blocks[k];
                        }
                        if (Main.Team[j].Blocks[k].x === currentTileX && Main.Team[j].Blocks[k].y === currentTileY) {
                            currentBlock = Main.Team[j].Blocks[k];
                        }
                    }
                    if (!!currentBlock && !!destinationXBlock && !!destinationYBlock) { break; }
                }

                // Collision checking taking into account players blocks
                if (((currentBlock && !destinationXBlock) || (!currentBlock && !destinationXBlock) || (currentBlock && destinationXBlock && currentBlock.x === destinationXBlock.x)) &&
                        (currentLevel.Data[currentTileY][playerTileX] === 1 ||
                        currentLevel.Data[currentTileY][playerTileX] === 10)) {
                    Main.Team[player].Player.x += vx * 48 / 1000 * delta;
                }
                if (((currentBlock && !destinationYBlock) || (!currentBlock && !destinationYBlock) || (currentBlock && destinationYBlock && currentBlock.y === destinationYBlock.y)) &&
                        (currentLevel.Data[playerTileY][currentTileX] === 1 ||
                        currentLevel.Data[playerTileY][currentTileX] === 10)) {
                    Main.Team[player].Player.y += vy * 48 / 1000 * delta;
                }
                if (!(vx === 0 && vy === 0)) {
                    Main.Team[player].Player.r = 270 - Math.atan2(vy, -vx) * 180 / Math.PI;
                }
            }

            // Bot Spawning
            for (team = 1; team <= 4; team += 1) {
                Main.Team[team].BotTimer -= delta;
                if (Main.Team[team].BotTimer <= 0) {
                    Main.Team[team].Bots.push({
                        sx: currentLevel.Point["Start" + team].x * self.STATIC.TILE_WIDTH + self.STATIC.TILE_WIDTH / 2, // Starting X
                        sy: currentLevel.Point["Start" + team].y * self.STATIC.TILE_HEIGHT + self.STATIC.TILE_HEIGHT / 2, // Starting Y
                        r: 0, // Rotation
                        Route: Main.Team[team].Route.slice(),
                        t: 1000, // Movement timer
                        i: 0, // routing index
                        rr: false // re-routing
                    });
                    Main.Team[team].BotTimer += 3000;
                }
            }

            // Bot Movement
            //@TODO: Use variables to store, current bot, current team, start, end and destination x, y and rot for quicker calc
            for (team = 1; team <= 4; team += 1) {
                for (i = 0; i < Main.Team[team].Bots.length; i += 1) {
                    // Remove if no more steps
                    if (Main.Team[team].Bots[i].i > Main.Team[team].Bots[i].Route.length - 1) {
                        Main.Team[team].Bots.splice(i, 1);
                        break;
                    }

                    Main.Team[team].Bots[i].t -= delta;

                    // Lerp Between Point
                    Main.Team[team].Bots[i].x = lerp(Main.Team[team].Bots[i].sx, Main.Team[team].Bots[i].Route[Main.Team[team].Bots[i].i].x * self.STATIC.TILE_WIDTH + self.STATIC.TILE_WIDTH / 2, (1000 - Main.Team[team].Bots[i].t) / 1000);
                    Main.Team[team].Bots[i].y = lerp(Main.Team[team].Bots[i].sy, Main.Team[team].Bots[i].Route[Main.Team[team].Bots[i].i].y * self.STATIC.TILE_HEIGHT + self.STATIC.TILE_HEIGHT / 2, (1000 - Main.Team[team].Bots[i].t) / 1000);

                    // Work out rotation :: Maybe even lerp rotation
                    if (Main.Team[team].Bots[i].sx < Main.Team[team].Bots[i].Route[Main.Team[team].Bots[i].i].x * self.STATIC.TILE_WIDTH + self.STATIC.TILE_WIDTH / 2) {
                        Main.Team[team].Bots[i].r = 90;
                    }
                    if (Main.Team[team].Bots[i].sx > Main.Team[team].Bots[i].Route[Main.Team[team].Bots[i].i].x * self.STATIC.TILE_WIDTH + self.STATIC.TILE_WIDTH / 2) {
                        Main.Team[team].Bots[i].r = 270;
                    }
                    if (Main.Team[team].Bots[i].sy < Main.Team[team].Bots[i].Route[Main.Team[team].Bots[i].i].y * self.STATIC.TILE_HEIGHT + self.STATIC.TILE_HEIGHT / 2) {
                        Main.Team[team].Bots[i].r = 180;
                    }
                    if (Main.Team[team].Bots[i].sy > Main.Team[team].Bots[i].Route[Main.Team[team].Bots[i].i].y * self.STATIC.TILE_HEIGHT + self.STATIC.TILE_HEIGHT / 2) {
                        Main.Team[team].Bots[i].r = 0;
                    }

                    // Moving
                    if (Main.Team[team].Bots[i].t <= 0) {
                        Main.Team[team].Bots[i].sx = Main.Team[team].Bots[i].Route[Main.Team[team].Bots[i].i].x * self.STATIC.TILE_WIDTH + self.STATIC.TILE_WIDTH / 2;
                        Main.Team[team].Bots[i].sy = Main.Team[team].Bots[i].Route[Main.Team[team].Bots[i].i].y * self.STATIC.TILE_HEIGHT + self.STATIC.TILE_HEIGHT / 2;

                        //@TODO: Check for mines

                        // Reset timer
                        Main.Team[team].Bots[i].i += 1;
                        Main.Team[team].Bots[i].t += 1000;

                        // Make re-routing only happen when reached a final resting place
                        if (Main.Team[team].Bots[i].rr) {
                            currentTileX = Math.floor(Main.Team[team].Bots[i].x / self.STATIC.TILE_WIDTH);
                            currentTileY = Math.floor(Main.Team[team].Bots[i].y / self.STATIC.TILE_HEIGHT);
                            Main.Team[team].Bots[i].Route = astar.search(currentLevel.Graph,
                                                                         currentLevel.Graph.grid[currentTileX][currentTileY],
                                                                         currentLevel.Graph.grid[currentLevel.Point["End" + team].x][currentLevel.Point["End" + team].y]);

                            // Reset bot indices
                            Main.Team[team].Bots[i].i = 0;
                            Main.Team[team].Bots[i].rr = false;
                        }
                    }
                }
            }

            // Explosion Updates
            //@TODO: Finish!
            for (i = 0; i < Main.Explosions.length; i += 1) {
                Main.Explosions[i].t -= delta;
                if (Main.Explosions[i].t <= 0) {
                    Main.Explosions.splice(i, 1);
                    i -= 1;
                }
            }

            // Mine Updates
            for (team = 1; team <= 4; team += 1) {
                for (i = 0; i < Main.Team[team].Mines.length; i += 1) {
                    exploded = false;

                    // Reduce Fuse
                    Main.Team[team].Mines[i].t -= delta;

                    // Destroy Bots //@TODO: Move to bot code
                    for (botTeam = 1; botTeam <= 4; botTeam += 1) {
                        for (bot = 0; bot < Main.Team[botTeam].Bots.length; bot += 1) {
                            botTileX = Math.floor(Main.Team[botTeam].Bots[bot].x / self.STATIC.TILE_WIDTH);
                            botTileY = Math.floor(Main.Team[botTeam].Bots[bot].y / self.STATIC.TILE_HEIGHT);
                            if (botTileX === Main.Team[team].Mines[i].x && botTileY === Main.Team[team].Mines[i].y) {
                                Main.Team[botTeam].Bots.splice(bot, 1);
                                exploded = true;
                                break;
                            }
                        }
                    }
                    if (exploded) {
                        Main.Team[team].Mines.splice(i, 1);
                        self.ItemDraw = true;
                        break;
                    }

                    // Explode
                    if (Main.Team[team].Mines[i].t <= 0 || Main.Team[team].Mines[i].detonate) {
                        mineTileX = Main.Team[team].Mines[i].x;
                        mineTileY = Main.Team[team].Mines[i].y;

                        // Create Explosion Image
                        self.Explosions.push({
                            x: mineTileX,
                            y: mineTileY,
                            t: 300,
                            team: team
                        });

                        // Remove Nearby Walls
                        for (j = 1; j <= 4; j += 1) {
                            for (k = 0; k < Main.Team[j].Blocks.length; k += 1) {
                                wallTileX = Main.Team[j].Blocks[k].x;
                                wallTileY = Main.Team[j].Blocks[k].y;

                                if ((wallTileX === mineTileX && wallTileY === mineTileY) ||
                                        (wallTileX === mineTileX - 1 && wallTileY === mineTileY) ||
                                        (wallTileX === mineTileX + 1 && wallTileY === mineTileY) ||
                                        (wallTileX === mineTileX && wallTileY === mineTileY - 1) ||
                                        (wallTileX === mineTileX && wallTileY === mineTileY + 1)) {

                                    // Remove tiles
                                    currentLevel.Graph.grid[wallTileX][wallTileY].weight = 1;
                                    Main.Team[j].Blocks.splice(k, 1);

                                    // Tell everything to update pathing
                                    calculateGuide();
                                    for (botTeam = 1; botTeam <= 4; botTeam += 1) {
                                        for (l = 0; l < Main.Team[botTeam].Bots.length; l += 1) {
                                            Main.Team[botTeam].Bots[l].rr = true;
                                        }
                                    }

                                    k -= 1;
                                }
                            }
                        }

                        // Explode Nearby Players
                        for (j = 1; j <= 4; j += 1) {
                            playerTileX = Math.floor(Main.Team[j].Player.x / self.STATIC.TILE_WIDTH);
                            playerTileY = Math.floor(Main.Team[j].Player.y / self.STATIC.TILE_HEIGHT);

                            if ((playerTileX === mineTileX && playerTileY === mineTileY) ||
                                        (playerTileX === mineTileX - 1 && playerTileY === mineTileY) ||
                                        (playerTileX === mineTileX + 1 && playerTileY === mineTileY) ||
                                        (playerTileX === mineTileX && playerTileY === mineTileY - 1) ||
                                        (playerTileX === mineTileX && playerTileY === mineTileY + 1)) {

                                // Reset Players
                                Main.Team[team].Player.x = Main.Team[team].Route[0].x * self.STATIC.TILE_WIDTH + self.STATIC.TILE_WIDTH / 2;
                                Main.Team[team].Player.y = Main.Team[team].Route[0].y * self.STATIC.TILE_HEIGHT + self.STATIC.TILE_HEIGHT / 2;
                            }
                        }

                        // Remove Nearby Bots
                        for (j = 1; j <= 4; j += 1) {
                            for (k = 0; k < Main.Team[j].Bots.length; k += 1) {
                                botTileX = Math.floor(Main.Team[j].Bots[k].x / self.STATIC.TILE_WIDTH);
                                botTileY = Math.floor(Main.Team[j].Bots[k].y / self.STATIC.TILE_HEIGHT);

                                if ((botTileX === mineTileX && botTileY === mineTileY) ||
                                        (botTileX === mineTileX - 1 && botTileY === mineTileY) ||
                                        (botTileX === mineTileX + 1 && botTileY === mineTileY) ||
                                        (botTileX === mineTileX && botTileY === mineTileY - 1) ||
                                        (botTileX === mineTileX && botTileY === mineTileY + 1)) {

                                    // Reset Players
                                    Main.Team[j].Bots.splice(k, 1);
                                }
                            }
                        }

                        // Explode Nearby Mines
                        for (j = 1; j <= 4; j += 1) {
                            for (k = 0; k < Main.Team[j].Mines.length; k += 1) {
                                currentTileX = Main.Team[j].Mines[k].x;
                                currentTileY = Main.Team[j].Mines[k].y;

                                if ((currentTileX === mineTileX - 1 && currentTileY === mineTileY) ||
                                        (currentTileX === mineTileX + 1 && currentTileY === mineTileY) ||
                                        (currentTileX === mineTileX && currentTileY === mineTileY - 1) ||
                                        (currentTileX === mineTileX && currentTileY === mineTileY + 1)) {

                                    // Set Mines to explode next tick > Pretty much instantly
                                    Main.Team[j].Mines[k].detonate = true;
                                }
                            }
                        }

                        // Remove self
                        Main.Team[team].Mines.splice(i, 1);
                        self.ItemDraw = true;
                    }
                }
            }

            // Drawing
            self.draw();
        }
    };

    // Draw each individual layer depending on update rate to save rendering & logic cycles
    self.draw = function () {
        var team,
            i;

        if (self.ItemDraw) {
            // Clear Layer
            self.Layers.ItemsContext.clearRect(0, 0, self.Layers.Items.width, self.Layers.Items.width);

            // Draw Guide
            drawGuide(self.Layers.ItemsContext, currentLevel.Data);

            // Draw Blocks
            for (team = 1; team <= 4; team += 1) {
                for (i = 0; i < Main.Team[team].Blocks.length; i += 1) {
                    self.Layers.ItemsContext.drawImage(Main.Team[team].Block_Template, Main.Team[team].Blocks[i].x * self.STATIC.TILE_WIDTH, Main.Team[team].Blocks[i].y * self.STATIC.TILE_HEIGHT);
                }
            }

            // Draw Mines
            for (team = 1; team <= 4; team += 1) {
                for (i = 0; i < Main.Team[team].Mines.length; i += 1) {
                    self.Layers.ItemsContext.drawImage(Main.Team[team].Mine_Template, Main.Team[team].Mines[i].x * self.STATIC.TILE_WIDTH, Main.Team[team].Mines[i].y * self.STATIC.TILE_HEIGHT);
                }
            }

            self.ItemDraw = false;
        }

        // Clear Entities Layer
        self.Layers.EntitiesContext.clearRect(0, 0, self.Layers.Entities.width, self.Layers.Entities.width);

        // Draw Bots
        for (team = 1; team <= 4; team += 1) {
            for (i = 0; i < Main.Team[team].Bots.length; i += 1) {
                drawRotatedImage(self.Layers.EntitiesContext, Main.Team[team].Bot_Template, Main.Team[team].Bots[i].x, Main.Team[team].Bots[i].y, Main.Team[team].Bots[i].r);
            }
        }

        // Draw Characters
        for (team = 1; team <= 4; team += 1) {
            drawRotatedImage(self.Layers.EntitiesContext, Main.Team[team].Character_Template, Math.floor(Main.Team[team].Player.x), Math.floor(Main.Team[team].Player.y), Main.Team[team].Player.r);
        }

        // Draw Explosions
        for (i = 0; i < self.Explosions.length; i += 1) {
            self.Layers.EntitiesContext.drawImage(Main.Team[self.Explosions[i].team].Explosion_Template,
                                    self.Explosions[i].x * self.STATIC.TILE_WIDTH - Main.Team[self.Explosions[i].team].Explosion_Template.width / 2 + self.STATIC.TILE_WIDTH / 2,
                                    self.Explosions[i].y * self.STATIC.TILE_HEIGHT - Main.Team[self.Explosions[i].team].Explosion_Template.height / 2 + self.STATIC.TILE_HEIGHT / 2);
        }

        // Draw Interface
    };

    self.tintImage = function (imgElement, tintColour) {
        var canvas,
            context,
            map,
            p,
            colour,
            nImage;

        // create hidden canvas (using image dimensions)
        canvas = document.createElement("canvas");
        canvas.width = imgElement.width;
        canvas.height = imgElement.width;

        context = canvas.getContext("2d");
        context.drawImage(imgElement, 0, 0);

        map = context.getImageData(0, 0, canvas.width, canvas.height);

        colour = hexToRGB(tintColour);

        // convert image to grayscale
        for (p = 0; p < map.data.length; p += 4) {
            map.data[p] = map.data[p] * colour.r / 255;
            map.data[p + 1] = map.data[p + 1] * colour.g / 255;
            map.data[p + 2] = map.data[p + 2] * colour.b / 255;
        }
        context.putImageData(map, 0, 0);

        nImage = new Image();
        nImage.src = canvas.toDataURL();
        return nImage;
    };

    loadImages = function (callback) {
        var imagesLoaded,
            imageLoaded,
            imagesToLoad,
            dimage,
            nimage,
            i;

        imagesToLoad = Data.Images.length;
        imagesLoaded = 0;

        imageLoaded = function () {
            imagesLoaded += 1;
            if (imagesLoaded === imagesToLoad) {
                console.log("Image Loading Complete");
                callback();
            }
        };

        for (i = 0; i < Data.Images.length; i += 1) {
            dimage = Data.Images[i];
            nimage = new Image();
            nimage.onload = imageLoaded;
            nimage.src = dimage.src;

            console.log("Loading " + dimage.Name);

            Main.Images[dimage.Name] = nimage;
        }
    };

    colourImages = function () {
        var colourBatch,
            i,
            j;

        // Create Team Coloured Images (Batch)
        colourBatch = [
            "Block_Template",
            "Bot_Template",
            "Character_Template",
            "Mine_Template",
            "Guide_Start_Template",
            "Guide_End_Template",
            "Explosion_Template"
        ];
        for (i = 0; i < colourBatch.length; i += 1) {
            for (j = 1; j <= 4; j += 1) {
                Main.Team[j][colourBatch[i]] = self.tintImage(Main.Images[colourBatch[i]], Main.Team[j].Colour);
            }
        }

        // Create team coloured guides of differing sizes
        for (j = 1; j <= 4; j += 1) {
            Main.Team[j].Guide = self.tintImage(Main.Images["Guide_" + j + "_Template"], Main.Team[j].Colour);
        }
    };

    // Convert Level to weighted array
    convertLevel = function (level) {
        var tileX,
            tileY,
            levelGraph;

        levelGraph = [];

        for (tileX = 0; tileX < 20; tileX += 1) {
            levelGraph[tileX] = [];
        }
        for (tileY = 0; tileY < 20; tileY += 1) {
            for (tileX = 0; tileX < 20; tileX += 1) {
                switch (level[tileY][tileX]) {
                case 0:
                    levelGraph[tileX][tileY] = 0;
                    break;
                case 10:
                case 1:
                    levelGraph[tileX][tileY] = 1;
                    break;
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                case 9:
                    levelGraph[tileX][tileY] = 100;
                    break;
                }
            }
        }
        return levelGraph;
    };

    hexToRGB = function (hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    drawRotatedImage = function (context, image, x, y, angle) {
        // save the current co-ordinate system
        // before we screw with it
        context.save();

        // move to the middle of where we want to draw our image
        context.translate(x, y);

        // rotate around that point, converting our
        // angle from degrees to radians
        context.rotate(angle * Math.PI / 180);

        // draw it up and to the left by half the width
        // and height of the image
        context.drawImage(image, -(image.width / 2), -(image.height / 2));

        // and restore the co-ords to how they were when we began
        context.restore();
    };

    drawLevel = function (context, level) {
        var tileX,
            tileY,
            drawX,
            drawY;

        for (tileY = 0; tileY < 20; tileY += 1) {
            for (tileX = 0; tileX < 20; tileX += 1) {
                drawX = tileX * self.STATIC.TILE_WIDTH;
                drawY = tileY * self.STATIC.TILE_HEIGHT;

                switch (level[tileY][tileX]) {
                case 0:
                    context.drawImage(Main.Images.Block_Template, drawX, drawY);
                    break;
                case 1:
                    context.drawImage(Main.Images.Floor, drawX, drawY);
                    break;
                case 2:
                    context.drawImage(Main.Team[1].Guide_Start_Template, drawX, drawY);
                    break;
                case 3:
                    context.drawImage(Main.Team[2].Guide_Start_Template, drawX, drawY);
                    break;
                case 4:
                    context.drawImage(Main.Team[3].Guide_Start_Template, drawX, drawY);
                    break;
                case 5:
                    context.drawImage(Main.Team[4].Guide_Start_Template, drawX, drawY);
                    break;
                case 6:
                    context.drawImage(Main.Team[1].Guide_End_Template, drawX, drawY);
                    break;
                case 7:
                    context.drawImage(Main.Team[2].Guide_End_Template, drawX, drawY);
                    break;
                case 8:
                    context.drawImage(Main.Team[3].Guide_End_Template, drawX, drawY);
                    break;
                case 9:
                    context.drawImage(Main.Team[4].Guide_End_Template, drawX, drawY);
                    break;
                case 10:
                    context.drawImage(Main.Images.Safe, drawX, drawY);
                    break;
                }
            }
        }
    };

    drawGuide = function (context) {
        var previousTile,
            currentTile,
            nextTile,
            tileNumber,
            team,
            i;

        // Draw Guides
        for (team = 1; team <= 4; team += 1) {
            previousTile = currentLevel.Point["Start" + team];
            // Draw the correct guide frame based on previous and next
            for (i = 0; i < Main.Team[team].Route.length - 1; i += 1) {
                currentTile = Main.Team[team].Route[i];
                nextTile = Main.Team[team].Route[i + 1];
                tileNumber = -1;

                // Horrible layered if statement incoming //@TODO: Cleanup code and speedup implementation
                if (previousTile.x === currentTile.x - 1) {         // Left
                    if (nextTile.x === currentTile.x + 1) {         // To Right
                        tileNumber = 0;
                    } else if (nextTile.y === currentTile.y + 1) {  // To Down
                        tileNumber = 4;
                    } else if (nextTile.y === currentTile.y - 1) {  // To Up
                        tileNumber = 5;
                    }
                } else if (previousTile.x === currentTile.x + 1) {  // Right
                    if (nextTile.x === currentTile.x - 1) {         // To Left
                        tileNumber = 0;
                    } else if (nextTile.y === currentTile.y + 1) {  // To Down
                        tileNumber = 3;
                    } else if (nextTile.y === currentTile.y - 1) {  // To Up
                        tileNumber = 2;
                    }
                } else if (previousTile.y === currentTile.y + 1) { // Down
                    if (nextTile.x === currentTile.x - 1) {         // To Left
                        tileNumber = 4;
                    } else if (nextTile.y === currentTile.y - 1) {  // To Up
                        tileNumber = 1;
                    } else if (nextTile.x === currentTile.x + 1) {  // To Right
                        tileNumber = 3;
                    }
                } else if (previousTile.y === currentTile.y - 1) { // Up
                    if (nextTile.x === currentTile.x - 1) {        // To Left
                        tileNumber = 5;
                    } else if (nextTile.x === currentTile.x + 1) {  // To Right
                        tileNumber = 2;
                    } else if (nextTile.y === currentTile.y + 1) {  // To Down
                        tileNumber = 1;
                    }
                }

                context.drawImage(Main.Team[team].Guide,
                                  tileNumber * self.STATIC.TILE_WIDTH,
                                  0,
                                  self.STATIC.TILE_WIDTH, self.STATIC.TILE_HEIGHT,
                                  Main.Team[team].Route[i].x * self.STATIC.TILE_WIDTH, Main.Team[team].Route[i].y * self.STATIC.TILE_HEIGHT,
                                  self.STATIC.TILE_WIDTH, self.STATIC.TILE_HEIGHT);
                previousTile = currentTile;
            }
        }
    };

    lerp = function (start, end, percent) {
        return start + percent * (end - start);
    };

    calculateGuide = function () {
        var team;

        // Level Pathing
        for (team = 1; team <= 4; team += 1) {
            Main.Team[team].Route = astar.search(currentLevel.Graph,
                currentLevel.Graph.grid[currentLevel.Point["Start" + team].x][currentLevel.Point["Start" + team].y],
                currentLevel.Graph.grid[currentLevel.Point["End" + team].x][currentLevel.Point["End" + team].y]);
        }
    };

    self.getCurrentLevel = function () {
        return currentLevel;
    };

    return self;
}());

window.addEventListener("load", Main.load);
