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
    Ti.API.info("view size: " + game.size.width + "x" + game.size.height + "W" + game.screen.width + "H" + game.screen.height);
    Ti.API.info("game screen size: " + game.screen.width + "x" + game.screen.height);

    // Start the game
    game.start();
    
    // create new 
	/*var text = platino.createTextSprite({text:"Particles as child demo.", fontSize:14});
	text.textAlign = Ti.UI.TEXT_ALIGNMENT_CENTER;
	text.color(1, 1, 1);
	text.center = {x:game.screen.width * 0.5, y:game.screen.height * 0.5};
	scene.add(text);*/


	// ===== Create sprites =====
		
		var parentRed  = createColoredSquare(
			width / 2, height / 2,
			100, 100,
			1, 0, 0
		);
		var childGreen = createColoredSquare(0, 0, 100, 100, 0, 1, 0);
		var childBlue  = createColoredSquare(0, 0, 100, 100, 0, 0, 1);

		var particles = platino.createParticles({
			image: "graphics/RES_Relationships_particle_child/particle.pex",
			x: 50,
			y: 50
		});

		scene.addBatch([ parentRed, childGreen, childBlue, particles ]);

	// ==========================

	// setup relationships
	parentRed.addChildNode(childGreen);
	childGreen.addChildNode(childBlue);
	childBlue.addChildNode(particles);

	// Animate red
	parentRed.move(width / 2, height / 2);

	parentRed.transform(platino.createTransform({
		angle: 360,
		repeat: -1,
		duration: 5000
	}));

	// Animate green
	childGreen.transform(platino.createTransform({
		x: 300,
		scaleY: 0.5,
		autoreverse: true,
		duration: 1000,
		repeat: -1
	}));

	// Animate 
	childBlue.transform(platino.createTransform({
		y: 300,
		autoreverse: true,
		duration: 2000,
		repeat: -1
	}));

});



/*
 * returns colored sprite-square
 */
function createColoredSquare(x, y, w, h, r, g, b) {
	var sprite = platino.createSprite({
		x: x || 0,
		y: y || 0,
		width:  w || 100,
		height: h || 100
	});
	sprite.color(r || 1, g || 1, b || 1);
	return sprite;
}



// Add your game view
window.add(game);

// load debug functions
// Ti.include("debug.js");

window.open({fullscreen:true, navBarHidden:true});