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

    var unify = require('unify');
    var variable = unify.variable;
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
    //boxing is explained later in more detail
    var boxedRect1 = unify.box(rectangle1);
    var boxedRect2 = unify.box(rectangle2);
    var result = boxedRect1.unify(boxedRect2);
    //result will only be null if unification fails
    if(result == null) { console.log('Unification Failed!'); }
    else {
        //rectangle1 height: 100
        console.log("rectangle1  height: " 
            + boxedRect1.get("height").toString());
        //rectangle2 location: [25, 35]
        console.log("rectangle2 location: [" 
            + boxedRect1.get("location")[0] + ", " 
            + boxedRect1.get("location")[1]  + "]");
    }

# Variables
________________________________


# Boxing
________________________________
The algorithm used to preform unification for unify.js has a linear worst case complexity. The naive algorithm has an exponetal worst case complexity. The algorithm requires that objects be "boxed" before an object can be unified. Boxing consits of two steps:

* Wrapping all value types in objects so they can be referenced.
* Converting all objects to arrays and flagging them as objects so they can be reconstructed. Objects must be converted to arrays because arrays have an order and objects/dictionaries in javascript do not have an order.

# Tins
________________________________
Calling the box function on an object returns a Tin. A tin provides a variety of methods related to unification and is the main interface through which you will work with unify.js. Some of the useful methods are:

* tin.unify(tin) : Unifies two tines together. Unify returns null when unification fails otherwise it returns [tin1, tin2].
* tin.get(varName) : Gets a variables bound value. If a variable is unbound or is bound to another variable a Variable object is returned.
* tin.getAll() : Returns a dictionary containing all variables and their currently bound values.
* tin.unbox() : Reverts the box operation returning the original json with bound variable values substituted in.
* tin.rollback() : Reverts all variable bindings that have resulted from unifying this tin with other tins.

# More Examples
________________________________
### Extracting data
### Validating data
### Transforming data