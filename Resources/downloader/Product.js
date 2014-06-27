// var Backbone = require("lib/Backbone");

Product.prototype.FREE = 0x1;
Product.prototype.PAID = 0x3;

Product.prototype.obtain = function(type) {

	var self = this;
	
	var sFree = new Semaphore();
	var sPaid = new Semaphore();

	function obtain(key, array, semaphore) {
		if (type & key) {
			array.forEach(function(res) {
				if (!res.READY_TO_USE) {
					self.READY_TO_USE &= ~key;
					semaphore.increase();
					res.obtain();
				}
			});
			semaphore.callback = function() {
				self.READY_TO_USE |= key;
			};
		}
	}

	obtain(Product.FREE, this.freeResources, sFree);
	obtain(Product.PAID, this.paidResources, sPaid);

}

Product.prototype.remove = function() {}

function Product() {

	// Product is a combination of two sets of resources: free and paid.
	this.freeResources = [];
	this.paidResources = [];
	
	// Bit mask that indicates what content is ready to use
	this.READY_TO_USE = 0;

}






// ===== Simple example =====

	var Puzzle = new Product({
		paidResources: {
			replay: {
				url: "http://path/to/puzzle.zip",
				file: appDataDir + "/dlc/puzzles/"
			}
		}
	});

	//puzzle.
	
// ==========================





var appDataDir = Ti.Filesystem.applicationDataDirectory;
var puzzleGame1_1 = new Product({
	resources: {
		thumbnail: {
			url: "http://path/to/thumbnail.jpg",
			file: appDataDir + "dlc/thumbnails/thumbnail1_1.png"
		},
		description: "http://path/to/description.txt",
		content: {
			url: "http://path/to/container.zip",
			folder: appDataDir + "dlc/puzzleGame1_1"			
		}
	}
});






puzzleSet:
	thumbnails.zip
	manifest
	shared.zip
	puzzle_3x2_1.zip
	puzzle_3x2_2.zip
	puzzle_3x2_3.zip
	puzzle_4x3_1.zip
	puzzle_4x3_2.zip
	puzzle_4x3_3.zip