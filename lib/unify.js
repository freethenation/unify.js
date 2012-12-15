(function() {
  var Box, DICT_FLAG, DictFlag, HIDDEN_VAR_PREFIX, Tin, Variable, bind, bind_tins, box, boxit, extern, g_hidden_var_counter, get_tin, isHiddenVar, isarray, isbool, isfunc, isnum, isobj, isstr, isundef, isvaluetype, str, toJson, unboxit, unify, _unify;

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

  isundef = function(o) {
    return typeof o === "undefined";
  };

  isbool = function(o) {
    return typeof o === "boolean";
  };

  isarray = function(o) {
    return (o != null) && Array.isArray(o);
  };

  isstr = function(o) {
    return typeof o === "string";
  };

  isnum = function(o) {
    return typeof o === "number";
  };

  isobj = function(o) {
    return o !== null && !isarray(o) && typeof o === "object";
  };

  isvaluetype = function(o) {
    return isbool(o) || isstr(o) || isnum(o);
  };

  isfunc = function(o) {
    return !!(o && o.constructor && o.call && o.apply);
  };

  toJson = function(elem) {
    var e;
    if (isarray(elem)) {
      return "[" + (((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = elem.length; _i < _len; _i++) {
          e = elem[_i];
          _results.push(toJson(e));
        }
        return _results;
      })()).join(',')) + "]";
    } else if (elem instanceof Box || elem instanceof Tin || elem instanceof Variable || elem instanceof DictFlag) {
      return str(elem);
    } else if (isobj(elem)) {
      return "{" + (((function() {
        var _results;
        _results = [];
        for (e in elem) {
          _results.push(e + ':' + toJson(elem[e]));
        }
        return _results;
      })()).join(',')) + "}";
    } else if (isstr(elem)) {
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
      if (isvaluetype(v) || v === null) {
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
      this.varlist = isobj(varlist) ? varlist : null;
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
      var n, vartin;
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
      } else if (isarray(vartin.node)) {
        return (function() {
          var _i, _len, _ref, _results;
          _ref = vartin.node;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(unboxit(n, vartin.varlist));
          }
          return _results;
        })();
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
      var changes, ret;
      changes = [];
      ret = unify(this, tin, changes);
      if (ret) {
        ret[0].changes.push.apply(ret[0].changes, changes);
        ret[1].changes.push.apply(ret[1].changes, changes);
      }
      return ret;
    };

    Tin.prototype.rollback = function() {
      var change, _i, _len, _ref;
      _ref = this.changes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        change = _ref[_i];
        change();
      }
      return this.changes.splice(0, this.changes.length);
    };

    return Tin;

  })();

  boxit = function(elem, tinlist) {
    var a, item, key;
    if (elem instanceof Variable) {
      if (tinlist != null) {
        tinlist[elem.name] = new Tin(elem.name, null, null);
      }
      return elem;
    } else if (elem instanceof Box) {
      return elem;
    } else if (isarray(elem)) {
      return (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = elem.length; _i < _len; _i++) {
          item = elem[_i];
          _results.push(boxit(item, tinlist));
        }
        return _results;
      })();
    } else if (isobj(elem)) {
      a = [];
      for (key in elem) {
        a.push([boxit(key, tinlist), boxit(elem[key], tinlist)]);
      }
      a.push(DICT_FLAG);
      return a.sort();
    } else if (isvaluetype(elem || elem === null)) {
      return new Box(elem);
    } else {
      throw "Don't understand the type of elem";
    }
  };

  unboxit = function(tree, varlist) {
    var e, hash, item, tin, _i, _len, _ref;
    if (isarray(tree)) {
      if (tree[tree.length - 1] === DICT_FLAG) {
        hash = new Object();
        _ref = tree.slice(0, tree.length - 1);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          e = _ref[_i];
          hash[unboxit(e[0])] = unboxit(e[1]);
        }
        return hash;
      } else {
        return (function() {
          var _j, _len1, _results;
          _results = [];
          for (_j = 0, _len1 = tree.length; _j < _len1; _j++) {
            item = tree[_j];
            _results.push(unboxit(item));
          }
          return _results;
        })();
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
    /*
        This function boxes an object. Before an object can be processed it must be "boxed" this consits of wrapping all value types in objects and converting all objects to arrays.
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

  unify = function(expr1, expr2, changes) {
    var success;
    if (changes == null) {
      changes = [];
    }
    success = true;
    expr1 = expr1 instanceof Tin ? expr1 : box(expr1);
    expr2 = expr2 instanceof Tin ? expr2 : box(expr2);
    success = _unify(expr1.node, expr1.varlist, expr2.node, expr2.varlist, changes);
    if (success === false) {
      return null;
    } else {
      return [expr1, expr2];
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
      if (n1 instanceof Box && n2 instanceof Box && isvaluetype(n1.value) && isvaluetype(n2.value)) {
        return n1.value === n2.value;
      } else if (isarray(n1) && isarray(n2)) {
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

}).call(this);
