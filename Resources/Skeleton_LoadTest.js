var window = Ti.UI.createWindow({backgroundColor:'black'});

// Obtain game module
var platino = require('com.ti.game2d');

var animo = require("animo");


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
game.addEventListener('onload', function(e) {
    // Your game screen size is set here if you did not specifiy game width and height using screen property.
    // Note: game.size.width and height may be changed due to the parent layout so check them here.
    Ti.API.info("view size: " + game.size.width + "x" + game.size.height + "W" + game.screen.width + "H" + game.screen.height);
    Ti.API.info("game screen size: " + game.screen.width + "x" + game.screen.height);

    // Start the game
    game.start();
    
    //why does \n does not work???
    
	// create new 
	var text = platino.createTextSprite({text:'Touch screen to create skeleton.', fontSize:14});
	text.textAlign = Ti.UI.TEXT_ALIGNMENT_CENTER;
	text.color(1, 1, 1);
	text.center = {x:game.screen.width * 0.5, y:game.screen.height * 0.5};
	scene.add(text);


	var text2 = platino.createTextSprite({text:'Touch move to drag the hand of the character.', fontSize:14});
	text2.textAlign = Ti.UI.TEXT_ALIGNMENT_CENTER;
	text2.color(1, 1, 1);
	text2.center = {x:game.screen.width * 0.5, y:game.screen.height * 0.5 + 20};
	scene.add(text2);
});

var mySkeleton = null;
function createSkeletonAtPosition(posX, posY)
{
    var suffix = "";

	if(mySkeleton == null)
	{
	    // load skeleton atlas based on device
        if (game.screen.width == 320 || game.screen.width == 480) { //iphone 2G,3G 3GS
            suffix = "";
        }
        else if(game.screen.width == 640 || game.screen.width == 960) { //iphone 4, 4S, 5, 5S (retina)
            suffix = "-hd";     
        }
        if(game.screen.width == 768 || game.screen.width == 1024) { //ipad 1, 2, mini
            suffix = "-ipad";     
        }
        else if(game.screen.width == 1536 || game.screen.width == 2048) { //ipad 3, 4 (retina)
            suffix = "-ipadhd";     
        }
	
	    mySkeleton = animo.createSkeletonWithFile("graphics/RES_Skeletons_LoadTest/skeletons/Officer_Officer"+ suffix +".json",
                                                  scene);     
    							
		mySkeleton.setPosition(posX, posY);
		//mySkeleton.setFlipX(true);
		mySkeleton.setAngle(0);
		//mySkeleton.batchNode.scale(1.5, 1.5);
	} else {
	    mySkeleton.setAngle(mySkeleton.getFlipX() ? 30 : 0);
	    //mySkeleton.batchNode.scale(1.5, 1.5);
	    //mySkeleton.batchNode.angle = 0;
	   mySkeleton.setFlipX(!mySkeleton.getFlipX());
	}
}


game.addEventListener('touchstart', function(e) {
    createSkeletonAtPosition(e.x, e.y);
});


game.addEventListener('touchmove', function(e) {
        
	if(mySkeleton){
    	//we flip the y point
    	var y = game.screen.height - e.y;
    	mySkeleton.setPositionForBoneNamed(e.x, y, "rightHand");    	
    }
});


// Add your game view
window.add(game);

// load debug functions
Ti.include("debug.js");

window.open({fullscreen:true, navBarHidden:true});
