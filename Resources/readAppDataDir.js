var window = Ti.UI.createWindow({backgroundColor:'black'});

// Obtain game module
var game2d = require("com.ti.game2d");

// Create view for your game.
// Note that game.screen.width and height are not yet set until the game is loaded
var game = game2d.createGameView();

// Frame rate can be changed (fps can not be changed after the game is loaded)
game.fps = 30;

// set initial background color to black
game.color(0, 0, 0);

// Create game scene
var scene = game2d.createScene();

// add your scene to game view
game.pushScene(scene);


// Onload event is called when the game is loaded.
// The game.screen.width and game.screen.height are not yet set until this onload event.
game.addEventListener('onload', function(e) {

    var width  = game.screen.width;
    var height = game.screen.height;

    // Your game screen size is set here if you did not specifiy game width and height using screen property.
    // Note: game.size.width and height may be changed due to the parent layout so check them here.
    Ti.API.info("view size: " + game.size.width + "x" + game.size.height + "W" + game.screen.width + "H" + game.screen.height);
    Ti.API.info("game screen size: " + game.screen.width + "x" + game.screen.height);

    // ===== Read from resources =====

        // sprite
        scene.add(game2d.createSprite({
            image: "graphics/RES_readAppDataDir/sprite/sprite.png",
            x: 0,
            y: 0 * height / 3
        }));
        // particles
        scene.add(game2d.createParticles({
            image: "graphics/RES_readAppDataDir/particles/particle.pex",
            x: 0,
            y: 1 * height / 3
        }));
        // sheet
        scene.add(game2d.createSpriteSheet({
            image: "graphics/RES_readAppDataDir/spritesheet/seagull.xml",
            x: 0,
            y: 2 * height / 3
        }));

    // ===============================

    // [
    //     "sprite",
    //     "particles",
    //     "spritesheet",
    // ].forEach(function(e) {
    //     Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, e).createDirectory();
    // });

    // // auto copy from resources to app data
    // [
    //     // folders
    //     // "sprite",
    //     // "particles",
    //     // "spritesheet",
    //     // files
    //     "sprite/sprite.png",
    //     "particles/particle.pex",
    //     "particles/texture.png",
    //     "spritesheet/seagull.xml",
    //     "spritesheet/seagull.png"
    // ].forEach(function(e) {
    //     console.debug("Copying", e);
    //     var f = Ti.Filesystem.getFile(
    //         Ti.Filesystem.resourcesDirectory, 
    //         "graphics/RES_readAppDataDir/" + e
    //     );
    //     console.debug("file exists? ", f.exists());
    //     // e = e.substr(0, e.indexOf("/"));
    //     // console.debug(Ti.Filesystem.applicationDataDirectory + e);
    //     f.copy(Ti.Filesystem.applicationDataDirectory);
    //     f = null;
    // });

    // ===== Read from appData =====
    
        // sprite
        scene.add(game2d.createSprite({
            image: "%APPDATA%/sprite/sprite.png",
            x: width / 2,
            y: 0 * height / 3
        }));
        // particles
        scene.add(game2d.createParticles({
            image: "%APPDATA%/particles/particle.pex",
            x: width / 2,
            y: 1 * height / 3
        }));
        // sheet
        scene.add(game2d.createSpriteSheet({
            image: "%APPDATA%/spritesheet/seagull.xml",
            x: width / 2,
            y: 2 * height / 3
        }));
        
    // =============================

    
    // Start the game
    game.start();

});



// Add your game view
window.add(game);

// load debug functions
var platino = game2d;
Ti.include("debug.js");


window.open({fullscreen:true, navBarHidden:true});
