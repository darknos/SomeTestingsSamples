var window = Ti.UI.createWindow({ backgroundColor: "black" });

var platino = require("com.ti.game2d");

// Create view for your game.
// Note that game.screen.width and height are not yet set until the game is loaded
var game = platino.createGameView();

// Frame rate can be changed (fps can not be changed after the game is loaded)
game.fps = 30;

// set initial background color to black
game.color(0, 0, 0);

// Create game scene
var scene = platino.createScene();

// add your scene to game view
game.pushScene(scene);

// Onload event is called when the game is loaded.
// The game.screen.width and game.screen.height are not yet set until this onload event.
game.addEventListener("onload", function(e) {

    var width  = game.screen.width;
    var height = game.screen.height;


    // Your game screen size is set here if you did not specifiy game width and height using screen property.
    // Note: game.size.width and height may be changed due to the parent layout so check them here.
    // Ti.API.info("view size: " + game.size.width + "x" + game.size.height + "W" + game.screen.width + "H" + game.screen.height);
    // Ti.API.info("game screen size: " + game.screen.width + "x" + game.screen.height);

    // Start the game
    game.start();

    var particles = platino.createParticles({
    	image: "graphics/RES_Particles_size/particle.pex",
    	
    	x: width / 2, y: height / 2
    	//width: 1, height: 1
    });
    particles.scaleFromCenter(5, 5, 0,0);

    scene.add(particles);

});



// Add your game view
window.add(game);

// load debug functions
// Ti.include("debug.js");

window.open({fullscreen:true, navBarHidden:true});