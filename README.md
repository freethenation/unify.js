# Unify.js
_________________________
An Efficient JavaScript Unification Library
# What is Unification?
_________________________
Unification is an algorithmic process that attempts to make two data structures identical by substituting/binding portions of them to each other. It is probably easiest to understand what unification is by looking at an example.

    var rectangle1 = {
        location:[25, 35],
        size:[100, variable("height")],
        color:"#000000"
    };
    var rectangle2 = {
        location:variable("location"),
        size:[100, 100],
        color:"#000000"
    };

In the above example if the two rectangle structures were unified. Each of them have a variable which is substituted/bound to a value in the other. The variable "height" in rectangle1 would be bound to the value "100" from rectangle2. The variable "location" in rectangle2 is bound to the value "[25, 35]" from rectangle1.

#Uses for Unification?
________________________________
Unification has lots of uses including. Examples of how each of these tasks can be accomplished with unify.js can be found below.

* Extracting data
* Validating data
* Transforming data

# Basic Usage
________________________________
Below is a basic example of how use unify.js.

    //import unify.js
    var unify = require('unify');
    var variable = unify.variable;
    //create some data structures to be unified
    var rectangle1 = {
        location:[25, 35],
        size:[100, variable("height")],
        color:"#000000"
    };
    var rectangle2 = {
        location:variable("location"),
        size:[100, 100],
        color:"#000000"
    };
    //box the objects so they can be unified
    var boxedRect1 = unify.box(rectangle1);
    var boxedRect2 = unify.box(rectangle2);
    //preform the unification
    var result = boxedRect1.unify(boxedRect2);
    //check if unification succeeded and print the results
    if(result) {
      //print "rectangle1 height: 100" to the console
      console.log("rectangle1  height: " 
        + boxedRect1.get("height").toString());
      //print "rectangle2 location: [25, 35]" to the console
      console.log("rectangle2 location: [" 
        + boxedRect1.get("location")[0] + ", " 
        + boxedRect1.get("location")[1]  + "]");
    }
    else {
      console.log('Unification Failed!');
    }

If you were unable to follow along don't worry the various aspects of the code above are explained in more detail below.

# Variables
________________________________
Variables are placeholders that can be bound/replaced when unifying two data structures. In unify.js they are created by calling
    
    unify.variable(variableName, typeFunc);

The variable name is how the variables bound value will be retrieved after unification. The typeFunc is an optional parameter that allows you ensure only certain types are bound to the variable. The example below makes this more clear.

    var unify = require('unify');
    var variable = unify.variable;
    var isNum = function(o){return typeof(o) == "number"}
    var expr1 = unify.box([variable("X", isNum),1])
    var expr2 = unify.box(["string",1])
    var expr3 = unify.box([1,1])
    if expr1.unify(expr2) {
      console.log("Unification successful! X=" + expr1.get("X").toString());
    }
    else {
      console.log("Unification unsuccessful!");
    }
    if expr1.unify(expr3) {
      console.log("Unification successful! X=" + expr1.get("X").toString());
    }
    else {
      console.log("Unification unsuccessful!");
    }
    //The following should be written to the console
    //Unification unsuccessful!
    //Unification successful! X=1

In the above example the first unification fails because isNum function returns false when the value "string" is passed. The second unification succeeds because isNum returns true when the value 1 is passed. There are several type checking functions included with unify.js which can be found in the unify.types namespace.

# Boxing
________________________________
The algorithm used by unify.js requires that objects be "boxed" before an object can be unified. Boxing consits of two steps:

* Wrapping all value types in objects so they can be referenced.
* Converting all objects to arrays and flagging them as objects so they can be reconstructed. Objects must be converted to arrays because unification is order dependent and the keys in javascript objects/dictionaries are unordered.

# TreeTin
________________________________
Calling the box function on an object returns a TreeTin. A TreeTin provides a variety of methods related to unification and is the main interface through which you will work with unify.js. Some of the useful methods are:

* TreeTin.unify(tin) : Unifies two tines together. Unify returns null when unification fails otherwise it returns [tin1, tin2].
* TreeTin.get(varName) : Gets a variables bound value. If a variable is unbound or is bound to another variable a Variable object is returned.
* TreeTin.getAll() : Returns a dictionary containing all variables and their currently bound values.
* TreeTin.unbox() : Reverts the box operation returning the original json with bound variable values substituted in.
* TreeTin.rollback() : Reverts all variable bindings that have resulted from unifying this tin with other tins.

# Algorithm and Performance
________________________________
The algorithm used to preform unification for unify.js has a linear worst case complexity. The naive algorithm has an exponetal worst case complexity. If you want to learn more about the alogorithm [click here](http://www.jollybit.com/2012/04/efficient-linear-unification-algorithm.html).

# More Examples
________________________________
### Validating data

	var unify = require('unify');
	var variable = unify.variable;
	var validRectangle = unify.box({
	  topLeft:[0,0],
	  topRight:[1,0],
	  bottomLeft:[0,1],
	  bottomRight:[1,1]
	});
	var invalidRectangle = unify.box({
	  topLeft:[0], //This is invalid there are not two coordinates!
	  topRight:[1,0],
	  bottomLeft:[0,1],
	  bottomRight:[1,1]
	});
	var rectangleValidator = unify.box({
	  topLeft:[variable("_",unify.isNum),variable("_",unify.isNum)],
	  topRight:[variable("_",unify.isNum),variable("_",unify.isNum)],
	  bottomLeft:[variable("_",unify.isNum),variable("_",unify.isNum)],
	  bottomRight:[variable("_",unify.isNum),variable("_",unify.isNum)]
	});
	//Validate validRectangle
	if (rectangleValidator.unify(validRectangle)) {
	  console.log("validRectangle is valid!");
	}
	else {
	  console.log("validRectangle is invalid!");
	}
	//We need to rollback the unification before we can validate agian
	rectangleValidator.rollback();
	//Validate invalidRectangle
	if (rectangleValidator.unify(invalidRectangle)) {
	  console.log("invalidRectangle is valid!");
	}
	else {
	  console.log("invalidRectangle is invalid!");
	}
	rectangleValidator.rollback();
	//The above code will print the following to the console
	//validRectangle is valid!
	//invalidRectangle is invalid!

You can play with this example at JS Bin by clicking [here](http://jsbin.com/unifyvalidate/6/edit)

### Extracting data

	var unify = require('unify');
	var arrayToString = function(arr){
	  return "[" + arr.join() + "]";
	};
	var variable = unify.variable;
	var rectangle = unify.box({
	  topLeft:[0,0],
	  topRight:[1,0],
	  bottomLeft:[0,1],
	  bottomRight:[1,1]
	});
	var extractor = unify.box({
	  topLeft:variable("topLeft",unify.isNum),
	  topRight:variable("topRight",unify.isNum),
	  bottomLeft:variable("bottomLeft",unify.isNum),
	  bottomRight:variable("bottomRight",unify.isNum)
	});
	//extract the corners of the rectangle
	if (extractor.unify(rectangle)) {
	  console.log("topLeft: " + arrayToString(extractor.get("topLeft")));
	  console.log("topRight: " + arrayToString(extractor.get("topRight")));
	  console.log("bottomLeft: " + arrayToString(extractor.get("bottomLeft")));
	  console.log("bottomRight: " + arrayToString(extractor.get("bottomRight")));
	}
	else {
	  console.log("Somthing went wrong. Unification failed!");
	}
	extractor.rollback();
	//The above code will print the following to the console
	//"topLeft: [0,0]"
	//"topRight: [1,0]"
	//"bottomLeft: [0,1]"
	//"bottomRight: [1,1]"
	
You can play with this example at JS Bin by clicking [here](http://jsbin.com/unifyvalidate/8/edit)

### Transforming data

    //This example transforms a rectangle and triangle into an array of lines
    var unify = require('unify');
    var arrayToString = function(arr){
      var out = [];
      for(var i=0; i < arr.length; i++) {
        var o = arr[i];
        if((o !== null) && Array.isArray(o))
          out.push(arrayToString(o));
        else
          out.push(o.toString());
      }
      return "[" + out.join() + "]";
    };
    var variable = unify.variable;
    var rectangle = {
      topLeft:[0,0],
      topRight:[1,0],
      bottomLeft:[0,1],
      bottomRight:[1,1]
    };
    var transform  = unify.box({
      topLeft:variable("topLeft",unify.isNum),
      topRight:variable("topRight",unify.isNum),
      bottomLeft:variable("bottomLeft",unify.isNum),
      bottomRight:variable("bottomRight",unify.isNum),
      lines:[
        [variable("topLeft"),variable("topRight")],
        [variable("topRight"),variable("bottomRight")],
        [variable("bottomRight"),variable("bottomLeft")],
        [variable("bottomLeft"),variable("topLeft")]
      ]
    });
    /*
    need to add the lines element to the rectangle
    so that it will unify but we don't care what it ends
    up being after unification.
    */
    rectangle.lines = variable("_");
    rectangle = unify.box(rectangle);
    //preform the actual unification
    if (transform.unify(rectangle)) {
      //unbox transform so it is normal json object
      var transformed = transform.unbox();
      //loop through the lines and print them
      for (var i=0; i<transformed.lines.length; i++) {
        console.log("line "+i.toString()+": "+
          arrayToString(transformed.lines[i]));
      }
    }
    else {
      console.log("Somthing went wrong. Unification failed!");
    }
    transform.rollback();
    //The above code will print the following to the console
    //"line 0: [[0,0],[1,0]]"
    //"line 0: [[0,0],[1,0]]"
    //"line 2: [[1,1],[0,1]]"
    //"line 3: [[0,1],[0,0]]"
    
You can play with this example at JS Bin by clicking [here](http://jsbin.com/unifyvalidate/17/edit)