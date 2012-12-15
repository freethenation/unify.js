(function() {
  var Box, DICT_FLAG, DictFlag, HIDDEN_VAR_PREFIX, Tin, Variable, bind, bind_tins, box, boxit, extern, g_hidden_var_counter, get_tin, isHiddenVar, map, str, toJson, types, unboxit, _unify;

  if (typeof module === 'undefined') {
    window.JSUnify = {};
  }

  extern = function(name, o) {
    if (typeof module === 'undefined') {
      return window.JSUnify[name] = o;
    } else {
      return module.exports[name] = o;
    }
  };

  str = function(o) {
    if (typeof o === "undefined") {
      return "undefined";
    } else if (o === null) {
      return "null";
    } else {
      return o.toString();
    }
  };

  map = function(arr, func) {
    var i, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = arr.length; _i < _len; _i++) {
      i = arr[_i];
      _results.push(func(i));
    }
    return _results;
  };

  types = {
    isUndef: function(o) {
      return typeof o === "undefined";
    },
    isBool: function(o) {
      return typeof o === "boolean";
    },
    isArray: function(o) {
      return (o != null) && Array.isArray(o);
    },
    isStr: function(o) {
      return typeof o === "string";
    },
    isNum: function(o) {
      return typeof o === "number";
    },
    isObj: function(o) {
      return o !== null && !types.isArray(o) && typeof o === "object";
    },
    isValueType: function(o) {
      return types.isBool(o) || types.isStr(o) || types.isNum(o);
    },
    isFunc: function(o) {
      return !!(o && o.constructor && o.call && o.apply);
    }
  };

  toJson = function(elem) {
    var e;
    if (types.isArray(elem)) {
      return "[" + (map(elem, function(i) {
        return toJson(i);
      }).join(',')) + "]";
    } else if (elem instanceof Box || elem instanceof Tin || elem instanceof Variable || elem instanceof DictFlag) {
      return str(elem);
    } else if (types.isObj(elem)) {
      return "{" + (((function() {
        var _results;
        _results = [];
        for (e in elem) {
          _results.push(e + ':' + toJson(elem[e]));
        }
        return _results;
      })()).join(',')) + "}";
    } else if (types.isStr(elem)) {
      return "\"" + elem + "\"";
    } else {
      return str(elem);
    }
  };

  DictFlag = (function() {

    function DictFlag() {}

    DictFlag.prototype.toString = function() {
      return "new DictFlag()";
    };

    return DictFlag;

  })();

  DICT_FLAG = new DictFlag();

  Box = (function() {

    function Box(v) {
      if (types.isValueType(v) || v === null) {
        this.value = v;
      } else {
        throw "Can only box value types, not " + (toJson(v));
      }
    }

    Box.prototype.toString = function() {
      return "new Box(" + (toJson(this.value)) + ")";
    };

    return Box;

  })();

  g_hidden_var_counter = 1;

  HIDDEN_VAR_PREFIX = "__B3qgfO__";

  isHiddenVar = function(name) {
    return name.slice(0, HIDDEN_VAR_PREFIX.length) === HIDDEN_VAR_PREFIX;
  };

  Variable = (function() {

    function Variable(name) {
      if (name === "_") {
        this.name = HIDDEN_VAR_PREFIX + g_hidden_var_counter;
        g_hidden_var_counter += 1;
      } else {
        this.name = name;
      }
    }

    Variable.prototype.isHiddenVar = function() {
      return isHiddenVar(this.name);
    };

    Variable.prototype.toString = function() {
      return "variable(" + (toJson(this.name)) + ")";
    };

    return Variable;

  })();

  Tin = (function() {

    function Tin(name, node, varlist) {
      this.node = node != null ? node : null;
      this.varlist = types.isObj(varlist) ? varlist : null;
      this.chainlength = 1;
      this.name = name;
      this.changes = [];
    }

    Tin.prototype.end_of_chain = function() {
      var t;
      t = this;
      while (t.varlist instanceof Tin) {
        t = t.varlist;
      }
      return t;
    };

    Tin.prototype.isfree = function() {
      var t;
      t = this.end_of_chain();
      return t.node === null && t.varlist === null;
    };

    Tin.prototype.isHiddenVar = function() {
      return isHiddenVar(this.name);
    };

    Tin.prototype.toString = function() {
      /* Returns the representation of the tin. This is very useful for inspecting the current state of the tin.
      */
      return "new Tin(" + (toJson(this.name)) + ", " + (toJson(this.node)) + ", " + (toJson(this.varlist)) + ")";
    };

    Tin.prototype.get = function(varName) {
      var vartin;
      vartin = this.varlist[varName];
      if (vartin !== null && vartin !== void 0) {
        vartin = vartin.end_of_chain();
      }
      if (!(vartin != null)) {
        throw "Variable " + varName + " not in this tin";
      } else if (!(vartin.node != null) || vartin.node === null) {
        return new Variable(vartin.name);
      } else if (vartin.node instanceof Box) {
        return unboxit(vartin.node, vartin.varlist);
      } else if (vartin.node instanceof Variable) {
        return unboxit(vartin.node, vartin.varlist);
      } else if (types.isArray(vartin.node)) {
        return map(vartin.node, function(n) {
          return unboxit(n, vartin.varlist);
        });
      } else {
        throw "Unknown type in get";
      }
    };

    Tin.prototype.getAll = function() {
      var j, key;
      j = {};
      for (key in this.varlist) {
        if (!isHiddenVar(key)) {
          j[key] = this.get(key);
        }
      }
      return j;
    };

    Tin.prototype.unbox = function() {
      return unboxit(this.node);
    };

    Tin.prototype.unify = function(tin) {
      var changes, success;
      changes = [];
      if (!(tin instanceof Tin)) {
        tin = box(tin);
      }
      success = _unify(this.node, this.varlist, tin.node, tin.varlist, changes);
      if (success) {
        this.changes.push.apply(this.changes, changes);
        tin.changes.push.apply(tin.changes, changes);
        return [this, tin];
      } else {
        return null;
      }
    };

    Tin.prototype.rollback = function() {
      map(this.changes, function(change) {
        return change();
      });
      return this.changes.splice(0, this.changes.length);
    };

    return Tin;

  })();

  boxit = function(elem, tinlist) {
    var a, key;
    if (elem instanceof Variable) {
      if (tinlist != null) {
        tinlist[elem.name] = new Tin(elem.name, null, null);
      }
      return elem;
    } else if (elem instanceof Box) {
      return elem;
    } else if (types.isArray(elem)) {
      return map(elem, function(i) {
        return boxit(i, tinlist);
      });
    } else if (types.isObj(elem)) {
      a = [];
      for (key in elem) {
        a.push([boxit(key, tinlist), boxit(elem[key], tinlist)]);
      }
      a.push(DICT_FLAG);
      return a.sort();
    } else if (types.isValueType(elem || elem === null)) {
      return new Box(elem);
    } else {
      throw "Don't understand the type of elem";
    }
  };

  unboxit = function(tree, varlist) {
    var e, hash, tin, _i, _len, _ref;
    if (types.isArray(tree)) {
      if (tree[tree.length - 1] === DICT_FLAG) {
        hash = new Object();
        _ref = tree.slice(0, tree.length - 1);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          e = _ref[_i];
          hash[unboxit(e[0])] = unboxit(e[1]);
        }
        return hash;
      } else {
        return map(tree, function(i) {
          return unboxit(i);
        });
      }
    } else if (tree instanceof Box) {
      return tree.value;
    } else if (tree instanceof Variable) {
      if (varlist !== void 0) {
        try {
          tin = get_tin(varlist, tree);
        } catch (error) {
          return tree;
        }
        return unboxit(tin.node, tin.varlist);
      } else {
        return tree;
      }
    } else {
      throw "Unrecognized type '" + (typeof tree) + "' in unbox";
    }
  };

  box = function(elem) {
    /* This function boxes an object. Before an object can be processed it must be "boxed" this consits of wrapping all value types in objects and converting all objects to arrays.
    */

    var tinlist, tree;
    if (elem instanceof Tin) {
      return elem;
    }
    tinlist = {};
    tree = boxit(elem, tinlist);
    return new Tin(null, tree, tinlist);
  };

  get_tin = function(varlist, node) {
    if (!node instanceof Variable) {
      throw "Node must be a Variable to get_tin";
    }
    if ((varlist != null ? varlist[node.name] : void 0) != null) {
      return varlist[node.name];
    }
    throw "Couldn't find node " + node.name + " in varlist " + varlist;
  };

  bind = function(t, node, varlist, changes) {
    var called;
    t = t.end_of_chain();
    if (!t.isfree()) {
      return false;
    }
    t.node = node;
    t.varlist = varlist;
    called = false;
    return changes.push(function() {
      if (called) {
        return;
      }
      called = true;
      t.node = null;
      t.varlist = null;
      t.chainlength = 1;
    });
  };

  bind_tins = function(t1, t2, changes) {
    if (!t1.isfree() && !t2.isfree()) {
      return false;
    } else if (t1.isfree() && !t2.isfree()) {
      return bind(t1, t2.node, t2.varlist, changes);
    } else if (!t1.isfree() && t2.isfree()) {
      return bind(t2, t1.node, t1.varlist, changes);
    } else if (t2.chainlength < t1.chainlength) {
      t2.chainlength += 1;
      return bind(t2, null, t1, changes);
    } else {
      t1.chainlength += 1;
      return bind(t1, null, t2, changes);
    }
  };

  _unify = function(n1, v1, n2, v2, changes) {
    var idx, num, t1, t2, _i, _len, _ref;
    if (changes == null) {
      changes = [];
    }
    if (n1 === void 0 && n2 === void 0) {
      return true;
    }
    if (n1 === null && n2 === null) {
      return true;
    }
    if (n1 === null || n2 === null) {
      return false;
    }
    if (n1 instanceof Variable && n2 instanceof Variable) {
      t1 = get_tin(v1, n1);
      t2 = get_tin(v2, n2);
      if (!bind_tins(t1, t2, changes)) {
        if (!_unify(t1.node, t1.varlist, t2.node, t2.varlist, changes)) {
          return false;
        }
      }
    } else if (n1 instanceof Variable) {
      t1 = get_tin(v1, n1);
      if (!bind(t1, n2, v2, changes)) {
        if (!_unify(t1.node, t1.varlist, n2, v2, changes)) {
          return false;
        }
      }
    } else if (n2 instanceof Variable) {
      t2 = get_tin(v2, n2);
      if (!bind(t2, n1, v1, changes)) {
        if (!_unify(t2.node, t2.varlist, n1, v1, changes)) {
          return false;
        }
      }
    } else {
      if (n1 instanceof Box && n2 instanceof Box && types.isValueType(n1.value) && types.isValueType(n2.value)) {
        return n1.value === n2.value;
      } else if (types.isArray(n1) && types.isArray(n2)) {
        if (n1.length !== n2.length) {
          return false;
        }
        _ref = (function() {
          var _j, _ref, _results;
          _results = [];
          for (num = _j = 0, _ref = n1.length; 0 <= _ref ? _j <= _ref : _j >= _ref; num = 0 <= _ref ? ++_j : --_j) {
            _results.push(num);
          }
          return _results;
        })();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          idx = _ref[_i];
          if (!_unify(n1[idx], v1, n2[idx], v2, changes)) {
            return false;
          }
        }
      }
    }
    return true;
  };

  extern("box", box);

  extern("variable", function(name) {
    return new Variable(name);
  });

  extern("Tin", Tin);

  extern("Box", Box);

  extern("DICT_FLAG", DICT_FLAG);

  extern("toJson", toJson);

  extern("Variable", Variable);

  extern("types", types);

}).call(this);
