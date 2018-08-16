// Stores all blocks and their relative positions in a map
var worldMap = {blocks: save.blocks, width: save.mapWidth, height: save.mapHeight};

// Set a coordinate in the worldMap to a value
worldMap.set = function(x, y, block) {
	// If the coordinate is outside of the worldMap, return
	//if (x >= this.width || y >= this.height || x < 0 || y < 0)
	//	return;

	x = x - (Math.floor(x / worldMap.width) * worldMap.width);
	y = y - (Math.floor(y / worldMap.height) * worldMap.height);
	
	// Draws the block onto the canvas
	if (canvas.enabled) {
		if (typeof block === "number") {
			ctx.clearRect(x, y, 1, 1);
		} else {
			// Pick a color based on the block's type
			if (block.attributes.attack)
				ctx.fillStyle = "red";
			else if (block.attributes.brain)
				ctx.fillStyle = "green";
			else if (block.attributes.reproduction)
				ctx.fillStyle = "#fb04ab";
			else
				ctx.fillStyle = "grey";
			
			// Fill in the pixel
			ctx.fillRect(x, y, 1, 1);
		}
	}
		
	this.blocks[x + (y * this.width)] = block;
}

// Get a value from the worldMap given a coordinate
worldMap.get = function(x, y) {
	// If the coordinate is outside of the worldMap, return -1
	//if (x >= this.width || y >= this.height || x < 0 || y < 0)
	//	return -1;
	x = x - (Math.floor(x / worldMap.width) * worldMap.width);
	y = y - (Math.floor(y / worldMap.height) * worldMap.height);
	return this.blocks[x + (y * this.width)];
}

worldMap.getCoords = function(index) {
	index = index - (Math.floor(index / worldMap.blocks.length) * worldMap.blocks.length);
	return {x: index % worldMap.width, y: Math.floor(index / worldMap.width)};
}

worldMap.refreshCanvas = function() {
	worldMap.blocks.forEach(function(block, i) {
		var coords = worldMap.getCoords(i);
		worldMap.set(coords.x, coords.y, worldMap.get(coords.x, coords.y));
	});
}

{
	let enabled = true;
	
	Object.defineProperty(canvas, "enabled", {get() {
		return enabled;
	}, set(value) {
		enabled = value;
		if (enabled) {
			canvas.style.display = "block";
			worldMap.refreshCanvas();
		} else
			canvas.style.display = "none";
	}});
}

canvas.enabled = true;

save.blocks.forEach(function(block, i) {
	if (block === 1) {
		var x = i % save.mapWidth;
		var y = Math.floor(i / save.mapWidth);
		block = new Block(x, y, 1, undefined);
		ctx.fillStyle = "grey";
		ctx.fillRect(x, y, 1, 1);
	}
});

// Initialize the map to all 0s
/*for (var i = 0; i < (worldMap.width * worldMap.height); i++) {
	if (Math.random() > 0.05)
		worldMap.blocks.push(0);
	else
		new Block((i % worldMap.width), Math.floor(i / worldMap.width), 1, undefined);
}*/

// Organism constructor
function Organism(origin_x, origin_y, dna) {
	var self = this;
	var organismX = origin_x;
	var organismY = origin_y;
	
	// The data used to construct the organism
	var data = JSON.parse(dna);
	
	/* blockData stores data about the blocks that make up the organism
	 * blocks is just a list of the blocks that make up the organism
	 * map is an array which stores where the blocks that make up the organism are in relation to each other. The first 10 blocks are the first row of the organism, the second 10 are the second row, and so on
	 * topPerimeter, bottomPerimeter, leftPerimeter, and rightPerimeter are array storing which blocks make up the perimeters of the organism
	 * brain is an array storing the brain blocks of the organism
	 * reprodution is an array storing the reproduction blocks of the organism
	 */
	var blockData = {blocks: [], map: [], topPerimeter: [], bottomPerimeter: [], leftPerimeter: [], rightPerimeter: [], attack: [], brain: [], reproduction: []};
	
	// Gets the block in the specified coordinate
	blockData.map.get = function(x, y) {
		// If the coordinate is outside the map, returns -1;
		if (x >= 10 || y >= 10 || x < 0 || y < 0)
			return 0;
		return this[x + (y * 10)];
	}
	
	// Given a block and an optional index, returns the block's coordinates relative to the organism
	blockData.map.getCoords = function(block, index) {
		var i = !!index ? index : this.indexOf(block);
		if (index === -1)
			return {x: undefined, y: undefined};
		return {x: i % 10, y: Math.floor(i / 10)};
	}
	
	// Given a block and an optional index, returns an object containing that block's neighbors
	blockData.map.getNeighboringBlocks = function(block, index) {
		var blockCoords = this.getCoords(block, index);
		var neighbors = [];
		var blockNeighbors = {};
		var top = this.get(blockCoords.x, blockCoords.y - 1);
		var bottom = this.get(blockCoords.x, blockCoords.y + 1);
		var left = this.get(blockCoords.x - 1, blockCoords.y);
		var right = this.get(blockCoords.x + 1, blockCoords.y);
		
		typeof top !== "number" && top !== undefined ? blockNeighbors.top = top : undefined;
		typeof bottom !== "number" && bottom !== undefined ? blockNeighbors.bottom = bottom : undefined;
		typeof left !== "number" && left !== undefined ? blockNeighbors.left = left : undefined;
		typeof right !== "number" && right !== undefined ? blockNeighbors.right = right : undefined;
		
		return blockNeighbors;
	}
	
	// Removes a block from the blockData object
	blockData.removeBlock = function(block, wait) {
		this.blocks.splice(this.blocks.indexOf(block), 1);
		this.map.splice(this.map.indexOf(block), 1, 0);
		
		// Remove the block from blockData's attack, brain, or reproduction block arrays
		["attack", "brain", "reproduction"].forEach(function (str) {
			if (block.attributes[str])
				blockData[str].splice(blockData[str].indexOf(block), 1);
		});
	}
	
	// TODO optimize function based on the facts that any block destroyed will always be on a perimeter, and that when a perimeter block is destroyed, it is easy to predict which blocks will form the new perimeter
	// Computes which blocks are in the organism's perimeter
	blockData.computePerimeters = function() {
		this.topPerimeter = [];
		this.bottomPerimeter = [];
		this.leftPerimeter = [];
		this.rightPerimeter = [];
		this.map.forEach(function(block, i) {
			if (block === 0)
				return;
			
			// The coordinates of the block relative to the organism
			var blockCoords = blockData.map.getCoords(block, i);
			
			/*if (i === 13) {
				console.log(block);
				console.log(blockCoords);
				console.log(blockData.map.get(blockCoords.x - 1, blockCoords.y));
			}*/
			
			// Puts blocks in the right perimeter
			if (blockCoords.x === 9 || blockData.map.get(blockCoords.x + 1, blockCoords.y) === 0) {
				blockData.rightPerimeter.push(block);
				block.attributes.rightPerimeter = true;
			} else {
				block.attributes.rightPerimeter = false;
			}
			
			// Puts blocks in the left perimeter
			if (blockCoords.x === 0 || blockData.map.get(blockCoords.x - 1, blockCoords.y) === 0) {
				blockData.leftPerimeter.push(block);
				block.attributes.leftPerimeter = true;
			} else {
				block.attributes.leftPerimeter = false;
			}
			
			// Puts blocks in the top perimeter
			if (blockCoords.y === 0 || blockData.map.get(blockCoords.x, blockCoords.y - 1) === 0) {
				blockData.topPerimeter.push(block);
				block.attributes.topPerimeter = true;
			} else {
				block.attributes.topPerimeter = false;
			}
			
			// Puts blocks in the bottom perimeter
			if (blockCoords.y === 9 || blockData.map.get(blockCoords.x, blockCoords.y + 1) === 0) {
				blockData.bottomPerimeter.push(block);
				block.attributes.bottomPerimeter = true;
			} else {
				block.attributes.bottomPerimeter = false;
			}
		});
	}
	
	// Calls blockData's removeBlock method on a block
	this.removeBlock = function(block) {
		blockData.removeBlock(block);
	}
	
	// Initializes the blocks based on the organism's dna
	data.b.forEach(function(type, i) {
		if (type === 0) {
			blockData.map.push(0);
			return;
		}
		var blockCoords = blockData.map.getCoords(undefined, i);
		var block = new Block(blockCoords.x - 5 + organismX, blockCoords.y - 5 + organismY, type, self);
		blockData.blocks.push(block);
		blockData.map.push(block);
		
		// Categorize the block as a rightPerimeter block
		if (blockCoords.x === 9 || data.b[i + 1] === 0) {
			blockData.rightPerimeter.push(block);
			block.attributes.rightPerimeter = true;
		} else {
			block.attributes.rightPerimeter = false;
		}
		
		// Categorize the block as a leftPerimeter block
		if (blockCoords.x === 0 || data.b[i - 1] === 0) {
			blockData.leftPerimeter.push(block);
			block.attributes.leftPerimeter = true;
		} else {
			block.attributes.leftPerimeter = false;
		}
		
		// Categorize the block as a topPerimeter block
		if (blockCoords.y === 0 || data.b[i - 10] === 0) {
			blockData.topPerimeter.push(block);
			block.attributes.topPerimeter = true;
		} else {
			block.attributes.topPerimeter = false;
		}
		
		// Categorize the block as a bottomPerimeter block
		if (blockCoords.y === 9 || data.b[i + 10] === 0) {
			blockData.bottomPerimeter.push(block);
			block.attributes.bottomPerimeter = true;
		} else {
			block.attributes.bottomPerimeter = false;
		}
		
		// Categorize blocks as attack, brain, or reproduction
		if (type === 2)
			blockData.attack.push(block);
		if (type === 3)
			blockData.brain.push(block);
		if (type === 4)
			blockData.reproduction.push(block);
	});
	
	// The number of mass points the organism must acquire before it can reproduce
	var targetMass = blockData.blocks.length;
	
	// The number of mass points the organism has
	massPoints = 0;
	
	// If one of the organism's reproduction blocks is destroyed, a number of mass points are deducted, and that number is returned
	this.onReproductionDestruction = function() {
		var mass = massPoints / blockData.reproduction.length;
		massPoints -= Math.floor(mass);
		return Math.ceil(mass) + 1; // +1 for the reproduction block destroyed
	}
	
	// An object with functions to move the organism in all four directions, including a check to make sure the organism can move
	var move = (function() {
		// Makes sure the organism can move in the specified direction, then moves the organism in that direction
		var moveOrganism = function(positivePerimeter, negativePerimeter, positivePerimeterName, negativePerimeterName, dx, dy) {
			// Check if there are any blocks blocking the organism from moving
			var canMove = true;
			positivePerimeter.forEach(function(block) {
				var perimeterBlock = worldMap.get(block.x + dx, block.y + dy);
				if (typeof perimeterBlock !== "number" && !perimeterBlock.attributes.attack && !!perimeterBlock.organism && !block.attributes.attack) {
					canMove = false;
					return;
				}
			});
			
			if (!canMove)
				return;
			
			for (var i = 0; i < blockData.blocks.length; i++) {
				var block = blockData.blocks[i];
				
				if (block.attributes[positivePerimeterName]) {
					var oldBlock = worldMap.get(block.x + dx, block.y + dy);
					if (typeof oldBlock !== "number" && block.attributes.attack) {
						block.destroy(oldBlock);
						if (oldBlock.attributes.attack)
							i--;
					}
				}
				
				// Move blocks one space
				if (!!block.organism) {
					if (dx === 1)
						block.incX();
					else if (dx === -1)
						block.decX();
					else if (dy === 1)
						block.incY();
					else
						block.decY();
				}
			}
			
			/*blockData.blocks.forEach(function(block, i) {
				console.log("moving");
				if (block.attributes[positivePerimeterName]) {
					var oldBlock = worldMap.get(block.x + dx, block.y + dy);
					if (typeof oldBlock !== "number" && block.attributes.attack) {
						toRemove.push({block: block, oldBlock: oldBlock});
					}
				}
				
				// Move blocks one space
				if (!!block.organism) {
					if (dx === 1)
						block.incX();
					else if (dx === -1)
						block.decX();
					else if (dy === 1)
						block.incY();
					else
						block.decY();
				}
			});*/
		}
		
		// The object literal returned to the variable move
		return {
			// Calls moveOrganism with the parameters specifying the "up" direction
			up: function() {
				moveOrganism(blockData.topPerimeter, blockData.bottomPerimeter, "topPerimeter", "bottomPerimeter", 0, -1);
				organismY--;
				if (organismY < 0)
					organismY = worldMap.height;
			},
			
			// Calls moveOrganism with the parameters specifying the "down" direction
			down: function() {
				moveOrganism(blockData.bottomPerimeter, blockData.topPerimeter, "bottomPerimeter", "topPerimeter", 0, 1);
				organismY++;
				if (organismY >= worldMap.height)
					organismY = 0;
			},
			
			// Calls moveOrganism with the parameters specifying the "left" direction
			left: function() {
				moveOrganism(blockData.leftPerimeter, blockData.rightPerimeter, "leftPerimeter", "rightPerimeter", -1, 0);
				organismX--;
				if (organismX < 0)
					organismX = worldMap.width;
			},
			
			// Calls moveOrganism with the parameters specifying the "right" direction
			right: function() {
				moveOrganism(blockData.rightPerimeter, blockData.leftPerimeter, "rightPerimeter", "leftPerimeter", 1, 0);
				organismX++;
				if (organismX >= worldMap.width)
					organismX = 0;
			}
		}
	})();
	
	// Called when a block is destroyed. Checks which blocks are still connected to the organism's brain
	this.evaluateSelf = function() {
		// Temporarily disconnects all blocks
		blockData.blocks.forEach(function(block) {
			block.connected = false;
		});
		
		// Connects blocks given a starting block
		function connectBlocks(block) {
			// Connect the block
			block.connected = true;
			
			// Get the block's neighbors
			var neighbors = blockData.map.getNeighboringBlocks(block);
			
			// If the neighbor is not connected, call the connectBlocks function on it
			Object.keys(neighbors).forEach(function (key) {
				if (!!neighbors[key] && !neighbors[key].connected) {
					connectBlocks(neighbors[key]);
				}
			});
		}
		
		if (blockData.brain.length === 0) {
			organisms.splice(organisms.indexOf(self), 1);
		}
		
		// Connects blocks, starting with the organism's brains
		blockData.brain.forEach(function(brain) {
			connectBlocks(brain);
		});
		
		// Removes all blocks that are not connected
		blockData.blocks.forEach(function(block) {
			if (!block.connected)
				block.removeFromOrganism(true);
		});
		
		blockData.computePerimeters();
	}
	
	// The neural network that controls the organism
	if (!data.w || !data.bi) {
		var network = new Network(3, [424, 213, 2]);
		network.init();
		data.w = network.getWeights();
		data.bi = network.getBiases();
		dna = JSON.stringify(data);
	} else {
		var network = new Network(3, [424, 213, 2], data.w, data.bi);
		network.init();
	}
	
	// Runs the neural network
	this.makeDecision = function() {
		var inputs = [];
		for (var i = 0; i < 20; i++) {
			for (var j = 0; j < 20; j++) {
				var block = worldMap.get(j - 10 + organismX, i - 10 + organismY);
				if (typeof block !== "number") {
					block = block.getType();
				}
				inputs.push(Sigmoid(block));
			}
			inputs.push(pickRandom("-1.00", "1.00"));
		}
		inputs.push(massPoints / 100);
		inputs.push(targetMass / 100);
		
		var outputs = network.getOutputs();
		inputs.push(outputs[0]);
		inputs.push(outputs[1]);
		
		network.setInputs(inputs);
		network.compute();
		
		outputs = network.getOutputs();
		//console.log(outputs);
		if (Math.abs(outputs[0]) > Math.abs(outputs[1])) {
			if (outputs[0] > 0)
				move.up();
			else if (outputs[0] < 0)
				move.down();
		} else if (Math.abs(outputs[0]) < Math.abs(outputs[1])) {
			if (outputs[1] > 0)
				move.left();
			else if (outputs[1] < 0)
				move.right();
		}
	}
	
	Object.defineProperty(this, "massPoints", {set(x) {
		massPoints = x;
		if (massPoints >= targetMass) {
			console.log("New org!");
			new Organism(organismX + 15, organismY + 15, dna);
		}
	}, get() {
		return massPoints;
	}})
	
	// Gets the current state of the organism
	this.getState = function() {
		var state = [];
		
		blockData.map.forEach(function(block) {
			if (block === 0)
				state.push(0);
			else
				state.push(1);
		});
		
		return state;
	}
	
	this.loadState = function(state) {
		state.forEach(function(type, i) {
			if (type === 0) {
				blockData.map[i] = 0;
			}
		});
		
		self.evaluateSelf();
	}
	
	Organism.instances.push(this);
	
	// Getters to expose the organism's private variables. For debugging purposes only
	Object.defineProperty(this, "blockData", {get(){return blockData}});
	Object.defineProperty(this, "move", {get(){return move}});
	Object.defineProperty(this, "network", {get(){return network}});
	Object.defineProperty(this, "x", {get(){return organismX}});
	Object.defineProperty(this, "y", {get(){return organismY}});
	Object.defineProperty(this, "data", {get(){return data}});
}
Organism.instances = [];
save.orgInstances.forEach(function(instance) {
	var org = new Organism(instance.x, instance.y, instance.dna);
	org.massPoints = instance.massPoints;
	org.loadState(instance.state);
});

// Block constructor
function Block(x, y, type, organism) {
	var self = this;
	var x = x;
	var y = y;
	var type = type;
	
	// The organism the block is attached to
	var organism = organism;
	
	// If an organism is defined, the block is connected. Otherwise, it is not connected
	this.connected = !!organism;
	
	// The block's attributes, including what perimeters it is in and whether it is a brain, reproduction, or attack block
	this.attributes = {topPerimeter: false, bottomPerimeter: false, leftPerimeter: false, rightPerimeter: false, attack: type === 2, brain: type === 3, reproduction: type === 4};
	
	this.getType = function() {
		return type;
	}
	
	// Increment the block's x position
	this.incX = function() {
		if (worldMap.get(x, y) === self)
			worldMap.set(x, y, 0); // Remove the block from its position in the worldMap
		x++;
		x = x - (Math.floor(x / worldMap.width) * worldMap.width);
		worldMap.set(x, y, self); // Add the block to the worldMap in its new position
	}
	
	// Decrement the block's x position
	this.incY = function() {
		if (worldMap.get(x, y) === self)
			worldMap.set(x, y, 0); // Remove the block from its position in the worldMap
		y++;
		y = y - (Math.floor(y / worldMap.height) * worldMap.height);
		worldMap.set(x, y, self); // Add the block to the worldMap in its new position
	}
	
	// Increment the block's y position
	this.decX = function() {
		if (worldMap.get(x, y) === self)
			worldMap.set(x, y, 0); // Remove the block from its position in the worldMap
		x--;
		x = x - (Math.floor(x / worldMap.width) * worldMap.width);
		worldMap.set(x, y, self); // Add the block to the worldMap in its new position
	}
	
	// Decrement the block's y position
	this.decY = function() {
		if (worldMap.get(x, y) === self)
			worldMap.set(x, y, 0); // Remove the block from its position in the worldMap
		y--;
		y = y - (Math.floor(y / worldMap.height) * worldMap.height);
		worldMap.set(x, y, self); // Add the block to the worldMap in its new position
	}
	
	// Destroy another block
	this.destroy = function(block) {
		// If the block being destroyed is an attack block, the current block is also destroyed
		if (block.attributes.attack) {
			// Both organisms are given a mass point
			organism.massPoints++;
			if (!!block.organism) {
				block.organism.massPoints++;
				
				// The current block is destroyed
				self.onDestroy();
			}
		} 
		// If the block being destroyed is a reproduction block... (TODO, finish this comment)
		else if (block.attributes.reproduction) { 
			organism.massPoints += block.organism.onReproductionDestruction();
		} else {
			organism.massPoints++;
		}
		
		// Destroy the block
		block.onDestroy();
	}
	
	/* How to use the *onDestroy* and *removeFromOrganism* methods:
	 * *onDestroy* removes the block from the *worldMap*, removes the block from its organism, and removes the block's reference to its organism
	 *		*onDestroy* also call's the block's organism's *evaluateSelf* method to check which blocks have been disconnected
	 * 		*onDestroy* should only be called by another block's *destroy* method
	 * *removeFromOrganism* also removes the block from its organism and removes the block's reference to its organism.
	 * 		However, the block stays on the *worldMap*, unless the method was called by *onDestroy*, and the block's organism's *evaluateSelf* method is not called
	**/
	
	// This function is called when the block is destroyed
	this.onDestroy = function() {
		// Remove the block from the worldMap
		worldMap.set(x, y, 0);
		
		// If the block does not have an associated organism, return
		if (!organism)
			return;
		
		// Remove the block from its organism
		organism.removeBlock(self);
		
		// Call the organism's evaluateSelf function
		organism.evaluateSelf();
		
		organism = undefined;
	}
	
	// Removes the block from its organism, and removes the block's reference to its organism
	this.removeFromOrganism = function() {
		// Remove the block from its organism
		organism.removeBlock(self);
		
		organism = undefined;
	}
	
	Object.defineProperty(this, "x", {get(){return x}});
	Object.defineProperty(this, "y", {get(){return y}});
	//Object.defineProperty(this, "type", {get(){return type}});
	Object.defineProperty(this, "organism", {get(){return organism}});
	
	// Add the block to the worldMap
	worldMap.set(x, y, this);
}

var loop = (function(){
	var id;
	
	function start() {
		id = setInterval(function() {
			Organism.instances.forEach(function(org) {
				org.makeDecision();
			});
		}, 0);
	}
	
	function stop() {
		clearInterval(id);
	}
	
	return {start: start, stop: stop};
})();

function createSaveData() {
	loop.stop();
	/*function convertBinaryStringToUint8Array(bStr) {
		for (var i = 0; i < bStr.length % 8; i++) {
			bStr += "0";
		}
		var i, len = bStr.length, u8_array = new Uint8Array(Math.floor(len / 8));
		for (var i = 0; i < Math.floor(len / 8); i++) {
			u8_array[i] = Number("0b" + bStr.slice(i * 8, i * 8 + 8));
		}
		return u8_array;
	}*/
	
	function toBinary(number, bits) {
		var str = "";
		str = number.toString(2);
		while (str.length < bits) {
			str = "0" + str;
		}
		
		while (str.length > bits) {
			str = str.slice(1)
		}
		
		return str;
	}
	
	var dataLength = 32 + worldMap.width * worldMap.height + Organism.instances.length * (728096);
	var saveData = new BitArray(dataLength);
	var index = 0;
	
	// Add the width and height to the saveData
	saveData.splice(index, 16, toBinary(worldMap.width, 16));
	index += 16;
	saveData.splice(index, 16, toBinary(worldMap.height, 16));
	index += 16;
	
	// Add the map to the saveData
	worldMap.blocks.forEach(function (block) {
		if (block === 0)
			saveData.setBit(index, 0);
		else if (!block.organism)
			saveData.setBit(index, 1);
		else
			saveData.setBit(index, 0);
		index++;
	});
	
	Organism.instances.forEach(function (org) {
		var data = org.data;
		var state = org.getState();
		
		saveData.splice(index, 32, "01101111011001110111001001110011"); // The sequence 01101111011001110111001001110011 means that a new org is being defined
		index += 32;
		
		saveData.splice(index, 16, toBinary(org.x, 16));
		index += 16;
		
		saveData.splice(index, 16, toBinary(org.y, 16));
		index += 16;
		
		saveData.splice(index, 8, toBinary(org.massPoints, 8));
		index += 8;
		
		data.b.forEach(function (elem){
			saveData.splice(index, 3, toBinary(elem, 3));
			index += 3;
		});
		
		state.forEach(function (elem) {
			saveData.setBit(index, Number(elem));
			index++;
		});
		
		data.w.forEach(function (lw) {
			lw.forEach(function (nw, i) {
				nw.forEach(function (w) {
					var str = toBinary(Math.abs(w) * 100, 7);
					if (w < 0)
						str = "0" + str;
					else
						str = "1" + str;
					saveData.splice(index, 8, str);
					index += 8;
				});
			});
		});
		
		data.bi.forEach(function (lb) {
			lb.forEach(function (b) {
				var str = toBinary(Math.abs(b) * 100, 7);
				if (b < 0)
					str = "0" + str;
				else
					str = "1" + str;
				saveData.splice(index, 8, str);
				index += 8;
			});
		});
	});

	loop.start();
	return saveData.getUint8Array();
	//return saveData;
}

/*window.addEventListener("keydown", function(e) {
	switch (e.keyCode) {
        case 87:
			org1.move.up();
			break;
        case 83:
			org1.move.down();
			break;
        case 65:
			org1.move.left();
			break;
        case 68:
			org1.move.right();
			break;
    }
});*/