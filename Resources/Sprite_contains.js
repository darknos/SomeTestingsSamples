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



// sprites to test for contains
var spritesToTest = [];




// Onload event is called when the game is loaded.
// The game.screen.width and game.screen.height are not yet set until this onload event.
game.addEventListener("onload", function(e) {

    var width  = game.screen.width;
    var height = game.screen.height;

    // Start the game
    game.start();


    // create
    var original = createColoredNamedSquare(width / 2, height / 2, 100, 50, 1, 0, 0, "redOriginal");
    var rotated  = createColoredNamedSquare(width / 2, height / 2, 100, 50, 0, 1, 0, "greenRotated");
    var childOfRotated = createColoredNamedSquare(0, 100, 100, 50, 0, 0, 1, "blueChild");
    var scaled = createColoredNamedSquare(width / 2, height / 2, 100, 50, 1, 1, 0, "yellowScaled");

    // add
    scene.add(original);
    scene.add(rotated);
    scene.add(childOfRotated);
    scene.add(scaled);

    // init
    rotated.anchorPoint = {x: 0, y: 0};
    rotated.angle = 90;

    rotated.addChildNode(childOfRotated);

    scaled.anchorPoint = {x: 2, y: 0};
    scaled.scale(0.25, 1);
    // scaled.scaleX = 0.5;
    // scaled.angle = 30;

    spritesToTest = [original, rotated, childOfRotated, scaled];

});







function getSpritesContainingPoint(x, y) {
	return spritesToTest.filter(function(element) {
		var f = element.contains(x, y);
		// console.debug("sprite " + element.loadedData.name + ": " + f);
		return f;
	}).map(function(element) {
		return element.loadedData.name;
	})
}



game.addEventListener("touchstart", function(event) {

    Ti.API.info("Touch start was called at x: " + event.x + " y: " + event.y);

    // ===== Retina fix =====

		if (Ti.Platform.displayCaps.dpi > 163) {
			event.x *= 2;
			event.y *= 2;
		}

    // ======================

    // Contains test
    Ti.API.info(
    	"Sprites that contain this point: " +
		JSON.stringify(
    		getSpritesContainingPoint(event.x, event.y)
		)
	);

    // spritesAtXY test
	Ti.API.info(
		"scene.spritesAtXY: " + 
			scene.spritesAtXY({x: event.x, y: event.y})
				.map(function(e) { return e.loadedData.name })
	);
});




/*
 * returns colored sprite-square
 */
function createColoredNamedSquare(x, y, w, h, r, g, b, name) {
	/*console.debug(
		"Creating square at " + x + ", " + y + ", " +
		w + "x" + h
	);*/
	var sprite = platino.createSprite({
		x: x,
		y: y,
		width:  w,
		height: h,
		loadedData: { name: name }
	});
	sprite.color(r, g, b);
	return sprite;
}



// Add your game view
window.add(game);

// load debug functions
// Ti.include("debug.js");

window.open({fullscreen:true, navBarHidden:true});