(function() {
  var Test, str, test, unify;

  str = function(obj) {
    if (obj === null) {
      return "null";
    } else if (typeof obj === "undefined") {
      return "undefined";
    } else {
      return obj.toString();
    }
  };

  Test = (function() {

    function Test(name, func) {
      this.name = name;
      this.func = func;
      this.num = 0;
    }

    Test.prototype.expect = function(num) {
      return this.num = num;
    };

    Test.prototype.equal = function(arg1, arg2) {
      this.num--;
      if (arg1 !== arg2) {
        throw "'" + (str(arg1)) + "' does not equal '" + (str(arg2)) + "'";
      }
    };

    Test.prototype.ok = function(bool) {
      this.num--;
      if (!bool) {
        throw "false was passed to ok";
      }
    };

    Test.prototype.done = function() {
      if (this.num !== 0) {
        throw "" + (str(this.num)) + " more checks were expected before done was called";
      }
    };

    Test.prototype.run = function() {
      return this.func.call(this);
    };

    return Test;

  })();

  test = function(name, func) {
    var t;
    t = new Test(name, func);
    return exports[name] = function() {
      return t.run();
    };
  };

  exports.RunAll = function() {
    var name;
    for (name in exports) {
      if (name !== "RunAll") {
        try {
          exports[name]();
        } catch (ex) {
          console.log("Error in Test '" + name + "'");
          console.log(ex);
          console.log('');
        }
      }
    }
  };

  unify = require("../lib/unify");

}).call(this);
