var window = Ti.UI.createWindow({backgroundColor:'black'});

// Obtain game module
var platino = require('com.ti.game2d');

// Create view for your game.
// Note that game.screen.width and height are not yet set until the game is loaded
var game = platino.createGameView();

// Frame rate can be changed (fps can not be changed after the game is loaded)
game.fps = 30;

// set initial background color to black
game.color(0, 0, 0);

// Create game scene
var scene = platino.createScene();
scene.game = game;

var hudScene = scene.game.hudScene();

var centerLabel;

// Onload event is called when the game is loaded.
// The game.screen.width and game.screen.height are not yet set until this onload event.
game.addEventListener('onload', function(e) {
  // Your game screen size is set here if you did not specifiy game width and height using screen property.
  // Note: game.size.width and height may be changed due to the parent layout so check them here.
  Ti.API.info("view size : ("        + game.size.width   + ", " + game.size.height   + ")");
  Ti.API.info("game screen size : (" + game.screen.width + ", " + game.screen.height + ")");

  createNewSpriteAtPosition(scene, {
    x : 100,
    y : 50,
    name : "clearr.png"
  });

  eTransform(
    createNewSpriteAtPosition(scene, {
      x : 100,
      y : 300,
      name : "clearg.png"
    }), {
      scaleX : 0.3,
      scaleY : 0.3,
      duration : 1
    }
  );

  eTransform(
    createNewSpriteAtPosition(scene, {
      x : 100,
      y : 550,
      name : "cleary.png"
    }), {
      angle : 45,
      duration : 1
    }
  );

  var parent = createNewSpriteAtPosition(scene, {
    x : 100,
    y : 800,
    name : "clearw.png"
  });

  var child = createNewSpriteAtPosition(scene, {
    x : 10,
    y : 10,
    name : "clearb.png",
    size : 50
  });

  parent.addChildNode(child);


  createNewSpriteAtPosition(hudScene, {
    x : 400,
    y : 50,
    name : "clearr.png"
  });

  eTransform(
    createNewSpriteAtPosition(scene, {
      x : 400,
      y : 300,
      name : "clearg.png"
    }), {
      scaleX : 0.3,
      scaleY : 0.3,
      duration : 1
    }
  );

  eTransform(
    createNewSpriteAtPosition(scene, {
      x : 400,
      y : 550,
      name : "cleary.png"
    }), {
      angle : 45,
      duration : 1
    }
  );

  var hudParent = createNewSpriteAtPosition(scene, {
    x : 400,
    y : 800,
    name : "clearw.png"
  });

  var hudChild = createNewSpriteAtPosition(scene, {
    x : 10,
    y : 10,
    name : "clearb.png",
    size : 50
  });

  hudParent.addChildNode(hudChild);


  // add your scene to game view
  game.pushScene(scene);

  // Start the game
  game.start();

  centerLabel = Titanium.UI.createLabel({
    top   : 0,
    left  : 0,
    color : 'white',
    //backgroundColor:'clear',
    // text:'Touch screen to change sprite.\nPlease read the commets at line 45 in Sprites_LoadSpriteFromPNGTest.js',
    font : {
      fontSize : 20,
      fontFamily : 'Helvetica Neue'
    },
    //textAlign : 'center',
    width : game.size.width,
    height : Ti.UI.SIZE
  });
  // 
  // // add label to the window
  window.add(centerLabel);

});

function createNewSpriteAtPosition(localScene, opts) {

  var sprite = platino.createSprite({
    x : opts.x,
    y : opts.y,
    width  : (opts.size) ? opts.size : 200,
    height : (opts.size) ? opts.size : 200,
    image  : "graphics/RES_androidcore/" + opts.name,
    touchEnabled : true
  });

  sprite.addEventListener("singletap", function() {
    centerLabel.text += "; image = " + sprite.image;
  });
    
	localScene.add(sprite);

  return sprite;
}

function eTransform(sprite, opts) {
  var transform = platino.createTransform(opts);
  sprite.transform(transform);
}


game.addEventListener('touchstart', function(e) {

  centerLabel.text = "tap = (" + e.x + "," + e.y + ")";

  //var hud = scene.game.hudScene();
  var hudList = hudScene.spritesAtXY({               
      x : e.x,
      y : e.y
  });
  var list = hudList.concat(scene.spritesAtXY({
      x : e.x,
      y : e.y
  }));

  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    Ti.API.debug("s = ", s.image);
    if (s.touchEnabled) {
        Ti.API.debug("s.touchEnabled ");
        s.fireEvent("singletap");
        return;
    }
  } 
  
});

// Add your game view
window.add(game);

// load debug functions
//Ti.include("debug.js");

window.open({fullscreen:true, navBarHidden:true});
