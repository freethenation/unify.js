# unify.js
_________________________
An Efficient JavaScript Unification Library
# What is unification?
_________________________
Unification is an algorithmic process that attempts to make two data structures match by making substitutions or binding portions of them to each other. It is probably easiest to understand what unification is by looking at an example.

    var unify = require("unify");
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
    var result = unify.unify(rectangle1, rectangle2);
    //height = 100
    console.log("height = " + result[0].get("height").toString());
    //location = [100, 100]
    console.log("location = [" + result[1].get("location").join(",") + "]");

In the above example two rectangle structures are unified. Each of them have a variable which is substituted/bound to a value in the other. The variable "height" in rectangle1 is bound to the value 100 from rectangle2. The variable "location" in rectangle2 is bound to the value [25, 35] from rectangle1.
#Uses for unification?
________________________________
Unification has lots of uses including. Examples of how each of these tasks can be accomplished with unify.js can be found below.

* Extracting data
* Validating data
* Transforming data

# Basic usage
________________________________
# Variables
________________________________
# Boxing
________________________________
The algorithm used to preform unification for unify.js has a linear worst case complexity. The naive algorithm has an exponetal worst case complexity. The algorithm requires that objects be "boxed" before an object can be unified. Boxing consits of two steps:

* Wrapping all value types in objects so they can be referenced.
* Converting all objects to arrays and flagging them as objects so they can be reconstructed. Objects must be converted to arrays because arrays have an order and objects/dictionaries in javascript do not have an order.

# Tins
________________________________
Calling the box function on an object returns a Tin. 

# Examples
________________________________
### Extracting data
### Validating data
### Transforming data