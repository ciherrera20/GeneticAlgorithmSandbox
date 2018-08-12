/*
 * Network: A network of neurons arranged in layers
 *
 * numLayers: The number of layers in the network
 * neuronArray: An array with the Layers number of elements where each element corresponds with the number of neurons in each layer
 *
 * init(): Initializes the network (i.e. creates and stores the layers)
 */
function Network(numLayers, neuronArray)
{	
	var numLayers = numLayers; // The number of layers in the network
	var neuronArray = neuronArray; // The array whose elements correspond to the number of neurons in each layer
	var layers = []; // Array containing the layers of the network
	
	this.initialized = false; // Boolean to make sure the network is not initialized more than once
	
	this.init = function() // Initialization function. Creates the layers of the network and initializes them
	{
		if (this.initialized) // Check to make sure the network has not yet been initialized before proceeding
			return;
	
		console.blog("Initializing network");
	
		for (var i = 0; i < numLayers; i++) { // Add the layers to the *layers* array
			console.blog("	Creating layer " + (i + 1));
			
			if(i === 0) // Adds the input layer
				layers[i] = new Layer(neuronArray[i]);
			else // Adds the rest of the layers
				layers[i] = new Layer(neuronArray[i], layers[i - 1]);
				
			console.blog("	Initializing layer " + (i + 1));
			
			layers[i].init(); // Initializes the layer
		}
		
		this.initialized = true;
		
		console.blog("Network initialized");
	}
	
	this.setInputs = function(activationArray)
	{
		console.blog("Setting layer activations");
		layers[0].setActivations(activationArray);
	}
	
	this.compute = function()
	{
		console.blog("Evaluating network");
		for(var i = 1; i < numLayers; i++) {
			console.blog("	Computing layer " + (i + 1) + " activations");
			layers[i].computeActivations();
		}
	}
	
	this.getOutputs = function()
	{
		return layers.last().getActivations();
	}
}

/*
 * Layer: A layer of neurons that forms a part of the larger network
 * 
 * numNeurons: The number of neurons in the layer
 * previousLayer: A reference to the preceding layer. This is necessary for calculating the activations of each neuron
 *
 * init(): Initializes the layer (i.e. creates and stores the neurons)
 */
function Layer(numNeurons, previousLayer)
{
	var numNeurons = numNeurons; // The number of neurons in the layer
	var neurons = []; // An array of *numNeurons* neurons
	var previousLayer = previousLayer; // A reference to the preceding layer
	var inputLayer = !previousLayer; // If no previousLayer was defined, the inputLayer is set to true
	
	console.blog("		Input layer: " + JSON.stringify(inputLayer));
	
	function generateWeights(weights) // Generates an array with a *weights* number of randomly generated weights
	{
		console.blog("			Generating " + weights + " weights");
		var weightArray = [];
		for (var i = 0; i < weights; i++)
			weightArray.push(pickRandom("-1.00", "1.00"));
		console.blog("			Weights generated: " + JSON.stringify(weightArray));
		return weightArray;
	}
	
	this.initialized = false; // Boolean to make sure the layer is not initialized more than once
	
	this.init = function() // Initialization function. Creates the neurons of the layer
	{
		if (this.initialized) // Check to make sure the layer has not yet been initialized before proceeding
			return;
		
		for (var i = 0; i < numNeurons; i++) { // Adds the neurons to the *neurons* array
			console.blog("		Creating neuron " + (i + 1));
			if (inputLayer) // If the layer is an inputLayer, the neurons are initliazed without a bias or weights
				neurons.push(new Neuron());
			else
				neurons.push(new Neuron(pickRandom("-1.00", "1.00"), generateWeights(previousLayer.getNumNeurons())));
		}
		
		this.initialized = true;
	}
	
	this.computeActivations = function() 
	{
		if (inputLayer)
			return;
		
		for (var i = 0; i < numNeurons; i++) {
			console.blog("		Computing neuron " + (i + 1) + " activation");
			neurons[i].computeActivation(previousLayer.getActivations());
		}
	}
	
	this.getActivations = function() // Gets an array of the activation values of the neurons in the layer
	{
		console.blog("	Getting activations");
		var activations = [];
		for (var i = 0; i < numNeurons; i++)
			activations.push(neurons[i].getActivation());
		console.blog("	Activations: " + JSON.stringify(activations));
		return activations;
	}
	
	this.setActivations = function(activationArray)
	{
		if (inputLayer) {
			console.blog("	Setting neuron activations");
			for (var i = 0; i < numNeurons; i++) {
				console.blog("		Setting neuron " + (i + 1) + " activation");
				neurons[i].setActivation(activationArray[i]);
			}
		}
	}
	
	this.getNumNeurons = function() // Gets the number of neurons in the layer
	{
		return numNeurons;
	}
}

function Neuron(bias, weights)
{
	var bias = bias; // A multiplier to the weighted sum
	var weights = weights; // The weights given to each neuron in the previous layer
	var activation = 0; // The activation value of the neuron
	var inputNeuron = !bias || !weights; // If a bias or weights are not defined, the neuron is made an input neuron
	
	if (!!bias) console.blog("			Bias: " + bias);
	console.blog("			Input neuron: " + JSON.stringify(inputNeuron));
	
	function getWeightedSum(previousActivations) { // Gets the weighted sum of the previous layer's neurons' activation values
		console.blog("			Getting weighted sum");
		var weightedSum = 0;
		for (var i = 0; i < previousActivations.length; i++)
			weightedSum += previousActivations[i] * weights[i];
		console.blog("			Weighted sum: " + weightedSum);
		return weightedSum;
	}
	
	this.computeActivation = function(previousActivations) // computes the activation value based on the bias and a weighted sum
	{
		if (inputNeuron)
			return;
		
		activation = Sigmoid(bias * getWeightedSum(previousActivations));
		console.blog("			Activation: " + activation);
	}
	
	this.getActivation = function() // Gets the activation value of the neuron
	{
		return activation;
	}
	
	this.setActivation = function(num) // If the neuron is an input neuron, it sets the activation value of the neuron
	{
		if (inputNeuron) {
			activation = num;
			console.blog("			Activation set to " + num);
		}
	}
}

function Sigmoid(x) // Function which squishes the number line into a range between 0 and 1
{
	//return 1 / (1 + Math.pow(Math.E, -x));
	return x <= 1 && x >= -1 ? x : 1 * (Math.abs(x) / x);
}

function pickRandom(first, last) { // Picks a random number between two values with a precision equal to the precision of the least precise value. Accepts strings
	var findPrecision = function(num) {
		var num = num.toString();
		if(Math.floor(Number(num)).toString() !== num)
			return num.split(".")[1].length || 0;
		return 0;
	}
	var exp = findPrecision(first) > findPrecision(last) ? findPrecision(last) : findPrecision(first);
	
	first = Number(first);
	last = Number(last);
	
	return (Math.round(Math.random() * ((last * Math.pow(10, exp)) - (first * Math.pow(10, exp)))) + (first * Math.pow(10, exp))) / Math.pow(10, exp);
}

if (!Array.prototype.last) 
{
	Array.prototype.last = function() {
		return this[this.length - 1];
	}
}

if (!console.blog)
{
	var blog = false;
	console.blog = function(msg) {
		if(blog)
			console.log(msg);
	}
}