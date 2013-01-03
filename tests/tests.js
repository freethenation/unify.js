(function() {
  var Test, UnifyTest, prop, str, test, unifylib,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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

    Test.prototype.equal = function(arg1, arg2, message) {
      if (message == null) {
        message = "''";
      }
      this.num--;
      if (arg1 !== arg2) {
        throw "NotEqual: '" + (str(arg1)) + "' does not equal '" + (str(arg2)) + "'\n   " + message;
      }
    };

    Test.prototype.deepEqual = function(arg1, arg2, message) {
      if (message == null) {
        message = "";
      }
      this.num--;
      if (!require('deep-equal')(arg1, arg2)) {
        throw "NotEqual: '" + (str(arg1)) + "' does not equal '" + (str(arg2)) + "'\n   " + message;
      }
    };

    Test.prototype.ok = function(bool, message) {
      if (message == null) {
        message = "";
      }
      this.num--;
      if (!bool) {
        throw "NotOk: false was passed to ok\n   " + message;
      }
    };

    Test.prototype.done = function(message) {
      if (message == null) {
        message = "";
      }
      if (this.num !== 0) {
        throw "NotDone: " + (str(this.num)) + " more checks were expected before done was called\n   " + message;
      }
    };

    Test.prototype.run = function() {
      this.func.call(this);
      return this.done();
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

  exports.RunAll = function(throwException) {
    var name;
    for (name in exports) {
      if (name !== "RunAll") {
        if (throwException) {
          exports[name]();
        } else {
          try {
            exports[name]();
          } catch (ex) {
            console.log("Error in Test '" + name + "'");
            console.log("Message: " + ex);
            console.log("Stack:\n" + ex.stack);
            console.log('');
          }
        }
      }
    }
  };

  unifylib = require("../lib/unify");

  for (prop in unifylib) {
    global[prop] = unifylib[prop];
  }

  UnifyTest = (function(_super) {

    __extends(UnifyTest, _super);

    function UnifyTest() {
      return UnifyTest.__super__.constructor.apply(this, arguments);
    }

    UnifyTest.prototype.boxtest = function(obj) {
      this.num++;
      return this.deepEqual(box(obj).unbox(), obj, "box");
    };

    UnifyTest.prototype.unifytest = function(obj1, obj2) {
      var ret;
      this.num++;
      obj1 = box(obj1);
      obj2 = box(obj2);
      ret = obj1.unify(obj2);
      return this.ok(ret, "unify");
    };

    UnifyTest.prototype.unifyfailtest = function(obj1, obj2) {
      this.boxtest(obj1);
      this.boxtest(obj2);
      this.num++;
      obj1 = box(obj1);
      obj2 = box(obj2);
      return this.ok(!obj1.unify(obj2), "unify fail");
    };

    UnifyTest.prototype.gettest = function(tin, varValueDict) {
      var v, _results;
      _results = [];
      for (v in varValueDict) {
        this.num++;
        if (varValueDict[v] instanceof variable) {
          _results.push(this.ok(tin.get(v) instanceof variable, "get(" + v + ") = variable()"));
        } else {
          _results.push(this.deepEqual(tin.get(v), varValueDict[v], "get(" + v + ") == " + (toJson(varValueDict[v]))));
        }
      }
      return _results;
    };

    UnifyTest.prototype.fulltest = function(obj1, obj2, varValueDict1, varValueDict2) {
      this.boxtest(obj1);
      this.boxtest(obj2);
      obj1 = box(obj1);
      obj2 = box(obj2);
      this.unifytest(obj1, obj2);
      this.gettest(obj1, varValueDict1);
      return this.gettest(obj2, varValueDict2);
    };

    return UnifyTest;

  })(Test);

  test = function(name, func) {
    var t;
    t = new UnifyTest(name, func);
    return exports[name] = function() {
      return t.run();
    };
  };

  test("empty obj {} -> {}", function() {
    return this.fulltest({}, {}, {}, {});
  });

  test("empty obj {test:'test', cool:1},{test:'test', cool:1}", function() {
    return this.fulltest({
      test: "test",
      cool: 1
    }, {
      test: "test",
      cool: 1
    }, {}, {});
  });

  test("null test [null] -> [null]", function() {
    return this.fulltest([null], [null], {}, {});
  });

  test("variable equal [X] -> [1]", function() {
    return this.fulltest([variable("a")], [1], {
      a: 1
    }, {});
  });

  test("variable equal [X,X] -> [1,1]", function() {
    return this.fulltest([variable("a"), variable("a")], [1, 1], {
      a: 1
    }, {});
  });

  test("variable equal [[1,2,3]] -> [y]", function() {
    return this.fulltest([[1, 2, 3]], [variable("y")], {}, {
      y: [1, 2, 3]
    });
  });

  test("variable equal [[1,2,x],x] -> [y,3]", function() {
    return this.fulltest([[1, 2, variable("x")], variable("x")], [variable("y"), 3], {
      x: 3
    }, {
      y: [1, 2, 3]
    });
  });

  test("unbound variable [y]->[x]", function() {
    return this.fulltest([variable("y")], [variable("x")], {
      y: variable("x")
    }, {
      x: variable("x")
    });
  });

  test("variable equal [1,X,X] -> [Z,Z,1]", function() {
    return this.fulltest([1, variable("X"), variable("X")], [variable("Z"), variable("Z"), 1], {
      X: 1
    }, {
      Z: 1
    });
  });

  test("variable equal [X:isNum,X] -> [1,1]", function() {
    return this.fulltest([variable("a", types.isNum), variable("a")], [1, 1], {
      a: 1
    }, {});
  });

  test("variable equal [X:isNum,X] -> ['str','str']", function() {
    return this.unifyfailtest([variable("a", types.isNum), variable("a")], ['str', 'str'], {
      a: 1
    }, {});
  });

  test("variable equal [X:isNum,X:isStr] -> ['str','str']", function() {
    var threw;
    threw = false;
    try {
      this.fulltest([variable("a", types.isNum), variable("a", types.isStr)], ['str', 'str'], {
        a: 1
      }, {});
    } catch (ex) {
      threw = true;
    }
    return this.ok(threw, "Variable defined with two diffrent types did not throw exception");
  });

  test("variable equal [X,X] -> [1,2]", function() {
    return this.unifyfailtest([variable("a"), variable("a")], [1, 2]);
  });

  test("variable unequal [1,3,2] -> [Y,Y,2]", function() {
    return this.unifyfailtest([1, 3, 2], [variable("y"), variable("y"), 2]);
  });

  test("variable unequal [1,X,X] -> [Z,Z,3]", function() {
    return this.unifyfailtest([1, variable("X"), variable("X")], [variable("Z"), variable("Z"), 3]);
  });

  test("unify fail no state change", function() {
    var i1, i2a, i2b;
    this.expect(2);
    i1 = box([1, 2, 3]);
    i2a = [1, variable("a"), 4];
    i2b = box(i2a);
    this.ok(!i2b.unify(i1));
    return this.deepEqual(i2a, i2b.unbox());
  });

  test("simple black box unify test", function() {
    this.expect(1);
    return this.ok(box({
      a: [1, 2, 3]
    }).unify({
      a: [1, variable("b"), 3]
    }));
  });

  test("unbox bound variable", function() {
    var i1, i2;
    this.expect(2);
    i1 = box([1, variable("a")]);
    i2 = box([1, 1]);
    this.ok(i1.unify(i2));
    return this.deepEqual(i1.unbox(), i2.unbox());
  });

  test("bind test with no var", function() {
    var i1, i2;
    this.expect(1);
    i1 = box([1, variable("a")]);
    i2 = {
      test: "test",
      fun: "somthing"
    };
    return this.deepEqual(i1.bind("a", i2)[0].get("a"), i2);
  });

  test("bind test with var", function() {
    var i1, i2, i3;
    this.expect(1);
    i1 = box([1, variable("a")]);
    i2 = [1, variable("b")];
    i3 = [1, [1, 2]];
    return this.deepEqual(i1.bind("a", i2)[0].unify(i3)[0].unbox(), i3);
  });

  test("bind rollback", function() {
    var i1, i2;
    this.expect(2);
    i1 = [1, variable("a")];
    i2 = box(i1);
    i2.bind("a", {
      test: "test"
    });
    this.deepEqual([
      1, {
        test: "test"
      }
    ], i2.unbox());
    i2.rollback();
    return this.deepEqual(i1, i2.unbox());
  });

  test("variable equal [X,2,X] -> [1,2,1]", function() {
    var tins;
    this.expect(2);
    tins = box([variable("x"), 2, variable("x")]).unify([1, 2, 1]);
    this.ok(tins);
    return this.deepEqual(tins[0].getAll(), {
      "x": 1
    });
  });

  test("simple variable extraction test", function() {
    var tins;
    this.expect(1);
    tins = box({
      a: [1, 2, 3]
    }).unify({
      a: [1, variable("b"), 3]
    });
    return this.ok(tins[1].get("b") === 2);
  });

  test("extract all variables test", function() {
    var tins;
    this.expect(1);
    tins = box({
      a: [1, 2, 3]
    }).unify({
      a: [1, variable("b"), 3]
    });
    return this.deepEqual(tins[1].getAll(), {
      "b": 2
    });
  });

  test("create hidden variable", function() {
    this.expect(1);
    return this.ok((variable("_")).isHiddenVar());
  });

  test("simple hidden variable [_,X] -> [1,2]", function() {
    return this.fulltest([variable("_"), variable("x")], [1, 2], {
      "x": 2
    }, {});
  });

  test("multiple hidden variables [_,_,X] -> [1,2,3]", function() {
    return this.fulltest([variable("_"), variable("_"), variable("x")], [1, 2, 3], {
      "x": 3
    }, {});
  });

  test("[[1,_,3],[1,2,3]] -> [X,X]", function() {
    return this.fulltest([[1, variable("_"), 3], [1, 2, 3]], [variable("x"), variable("x")], {}, {
      "x": [1, 2, 3]
    });
  });

  test("simple greedy variable test [1,$a,b,5] -> [1,2,3,4,5]", function() {
    return this.fulltest([1, variable("$a"), variable("b"), 5], [1, 2, 3, 4, 5], {
      "a": [2, 3],
      "b": 4
    }, {});
  });

  test("both sides greedy variable test [1,$a,b,5] -> [1,b,3,5,b]", function() {
    return this.fulltest([1, variable("$a"), variable("b"), 5], [1, variable("b"), 3, 5, variable("b")], {
      "a": [5, 3],
      "b": 5
    }, {});
  });

  test("empty greedy variable test [1,$a,2]->[1,2] and [1,2]->[1,$a,2]", function() {
    this.fulltest([1, variable("$a"), 2], [1, 2], {
      "a": []
    }, {});
    return this.fulltest([1, 2], [1, variable("$a"), 2], {}, {
      "a": []
    });
  });

  test("greedy variable in both test [1,$a,3]->[$b,2,3] and [$b,2,3]->[1,$a,3]", function() {
    this.fulltest([1, variable("$a"), 3], [variable("$b"), 2, 3], {
      "a": [2]
    }, {
      "b": [1]
    });
    return this.fulltest([variable("$b"), 2, 3], [1, variable("$a"), 3], {
      "b": [1]
    }, {
      "a": [2]
    });
  });

  test("rollback successful unification", function() {
    var cobj1, cobj2, obj1, obj2;
    this.expect(3);
    obj1 = [1, 2, 3];
    obj2 = [variable("A"), variable("B"), 3];
    this.boxtest(obj1);
    this.boxtest(obj2);
    obj1 = box(obj1);
    obj2 = box(obj2);
    cobj1 = eval(obj1.toString());
    cobj2 = eval(obj2.toString());
    this.ok(obj1.unify(obj2), "unify");
    obj1.rollback();
    this.ok(obj1.toString() === cobj1.toString());
    return this.ok(obj2.toString() === cobj2.toString());
  });

}).call(this);
