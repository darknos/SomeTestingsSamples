//
// Using Box2d Physics (iOS only)
// 
// Note: Use TiGame2d module with Box2D support.
//      (Use com.googlecode.TiGame2d-iphone-box2d-x.x.zip instead of com.googlecode.TiGame2d-iphone-x.x.zip)
// 
// This is TiGame2d port of Appcelerator's Ti.Box2d module.
//
// For more information about Ti.Box2d, see official documentation below.
// https://github.com/appcelerator/titanium_modules/blob/master/box2d/mobile/ios/README.md
// 

var window = Ti.UI.createWindow({backgroundColor:'black'});

// Obtain game module
var TiGame2d = require('com.ti.game2d');

// Create view for your game.
// Note that game.screen.width and height are not yet set until the game is loaded
var game = TiGame2d.createGameView();

// The physics world surface accepts GameView instance.
var world = TiGame2d.createBox2dWorld({surface:game});
world.setGravity(0.0, -9.81);
game.addWorld(world);
// Frame rate can be changed (fps can not be changed after the game is loaded)
game.fps = 30;

// set initial background color to black
game.color(0, 0, 0);

game.debug = true;

var shapes = new Array();

// Create game scene
var scene = TiGame2d.createScene();

// create new shape
var boxShape  = TiGame2d.createSprite({width:64, height:64});
boxShape.addEventListener('touchstart', function(e) {
                          alert(e);
                          });

var ballShape = TiGame2d.createSprite({image:'graphics/A.png', width:32, height:32});

// create floor and walls 
var floor     = TiGame2d.createSprite();
var leftWall   = TiGame2d.createSprite();
var rightWall  = TiGame2d.createSprite();

// color(red, green, blue) takes values from 0 to 1
boxShape.color(1, 0, 0);
ballShape.color(0, 0, 1);

// add your shape to the scene
scene.add(boxShape);
scene.add(ballShape);
scene.add(floor);
scene.add(leftWall);
scene.add(rightWall);

// add your scene to game view
game.pushScene(scene);

// body.setAngle accepts radians value so we need this function
function degreeToRadians(x) {
    return (Math.PI * x / 180.0);
}

// bodyrefs are reference of physical bodies
var redBodyRef, blueBodyRef, floorRef, leftWallRef;

// Onload event is called when the game is loaded.
game.addEventListener('onload', function(e) {
                      // Your game screen size is set here if you did not specifiy game width and height using screen property.
                      // Note: game.size.width and height may be changed due to the parent layout so check them here.
                      Ti.API.info("view size: " + game.size.width + "x" + game.size.height);
                      Ti.API.info("game screen size: " + game.screen.width + "x" + game.screen.height);
                      
                      floor.width     = game.screen.width/2-10;
                      leftWall.width  = 10;
                      rightWall.width = 10;
                      
                      floor.height     = 10;
                      leftWall.height  = game.screen.height;
                      rightWall.height = game.screen.height;
                      
                      boxShape.move(game.screen.width  * 0.75 - boxShape.width  * 0.5, 0);
                      ballShape.move(game.screen.width * 0.75 - ballShape.width * 0.5, -32);
                      
                      floor.move(game.screen.width * 0.5, game.screen.height * 0.75);
                      
                      leftWall.move(0, 0);
                      rightWall.move(game.screen.width - rightWall.width, 0);
                      
                      // add bodies to the world
                      // Note: this should be done AFTER game.screen has been set and all sprites has been initialized
                      // otherwise physics world and its bodies can not determine their size.
                      redBodyRef = world.addBody(boxShape, {
                                                 density: 12.0,
                                                 friction: 0.3,
                                                 restitution: 0.4,
                                                 type: "dynamic"
                                                 });
                      
                      blueBodyRef = world.addBody(ballShape, {
                                                  radius: 16,
                                                  density: 12.0,
                                                  friction: 0.3,
                                                  restitution: 0.4,
                                                  type: "dynamic"
                                                  });
                      
                      floorRef = world.addBody(floor, {
                                               density:12.0,
                                               friction:1.3,
                                               restitution:0.4,
                                               type:"dynamic"
                                               });
                      
                      leftWallRef = world.addBody(leftWall, {
                                                  density:12.0,
                                                  friction:0.3,
                                                  restitution:0.4,
                                                  type:"static"
                                                  });
                      
                      rightWallRef = world.addBody(rightWall, {
                                                   density:12.0,
                                                   friction:0.3,
                                                   restitution:0.4,
                                                   type:"static"
                                                   });
                      
                      //redBodyRef.setAngle(degreeToRadians(45));
//                      floorRef.setAngle(degreeToRadians(0));
                      
                      
                      
                      var joint = world.createRevoluteJoint(leftWallRef, floorRef, {
                                                         enableLimit : true,
                                                         lowerAngle : -80,
                                                         upperAngle : 15,
                                                         enableMotor : true,
                                                         maxMotorTorque : 10,
                                                         
                                                         motorSpeed : 0,
                                                         anchorX: game.screen.width * 0.5,
                                                         anchorY: game.screen.height * 0.75,
                                                         collideConnected : false
                                  });
                      var joint2 = world.createRopeJoint(rightWallRef, floorRef, {
                                                         maxLength: 50,
                                                         anchorA_x: game.screen.width * 0.75,
                                                         anchorA_y: game.screen.height * 0.75,
                                                         anchorB_x: game.screen.width * 0.75,
                                                         anchorB_y: game.screen.height * 0.75,
                                  });
                      
                      // Start the game
                      game.start();
                      
                      // Start the physics world
                      world.start();

                      
                      });

world.addEventListener("collision", function(e) {
                       if ((e.a == redBodyRef || e.b == redBodyRef) && e.phase == "begin") {
                       Ti.API.info("the red block collided with something");
                       Ti.API.info(JSON.stringify(e));
                       }
                       });

game.addEventListener('touchstart', function(e) {
                      scene.fireSpriteEventAt(e);                      
                      });

// Add your game view
window.add(game);
window.open({fullscreen:true, navBarHidden:true});