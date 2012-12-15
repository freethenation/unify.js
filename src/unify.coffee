# utils
if typeof module == 'undefined' then window.JSUnify={}
extern=(name, o)->if typeof module == 'undefined' then window.JSUnify[name] = o else module.exports[name] = o
str=(o)->
    if typeof o == "undefined"
        return "undefined"
    else if o==null
        return "null"
    else
       return o.toString()
map=(arr, func)->(func(i) for i in arr)

# type testing functions
types = {
    isUndef: (o) -> typeof o == "undefined"
    isBool: (o) -> typeof o == "boolean"
    isArray: (o) -> o? && Array.isArray o
    isStr: (o) -> typeof o == "string"
    isNum: (o) -> typeof o == "number"
    isObj: (o) -> o!=null and not types.isArray(o) and typeof o == "object"
    isValueType: (o) -> types.isBool(o) or types.isStr(o) or types.isNum(o)
    isFunc: (o) -> !!(o && o.constructor && o.call && o.apply)
}

# util function to convert data types to strings
toJson=(elem) ->
    if types.isArray elem
        return "[#{ map(elem, (i)->toJson(i)).join(',') }]"
    else if elem instanceof Box or elem instanceof Tin or elem instanceof Variable or elem instanceof DictFlag
        return str(elem)
    else if types.isObj elem
        return "{#{ (( e + ':' + toJson(elem[e])) for e of elem).join(',') }}"
    else if types.isStr elem
        return "\"#{ elem }\""
    else
        return str(elem)

# metadata to indicate this was a dictionary
class DictFlag
    toString: () -> "new DictFlag()"
DICT_FLAG = new DictFlag()

class Box
    constructor: (v) ->
        if types.isValueType(v) || v == null
            @value = v
        else
            throw "Can only box value types, not #{ toJson v }"
    toString: () -> ("new Box(#{ toJson(@value) })")

g_hidden_var_counter = 1
HIDDEN_VAR_PREFIX = "__B3qgfO__"
isHiddenVar = (name) -> name[0...HIDDEN_VAR_PREFIX.length] == HIDDEN_VAR_PREFIX
class Variable
    constructor: (name) ->
        if name == "_"
            @name = HIDDEN_VAR_PREFIX + g_hidden_var_counter
            g_hidden_var_counter += 1
        else
            @name = name
    isHiddenVar: () -> isHiddenVar @name
    toString: () -> "variable(#{ toJson @name })"

class Tin
    constructor: (name, node, varlist) ->
        @node = if node? then node else null
        @varlist = if types.isObj(varlist) then varlist else null
        @chainlength = 1
        @name = name
        @changes = []
    end_of_chain: () ->
        t = this
        t = t.varlist while t.varlist instanceof Tin
        return t
    isfree: () ->
        t = @end_of_chain()
        return t.node == null and t.varlist == null
    isHiddenVar: () -> isHiddenVar @name
    toString:() -> 
        ### Returns the representation of the tin. This is very useful for inspecting the current state of the tin. ###
        "new Tin(#{ toJson @name }, #{ toJson @node }, #{ toJson @varlist})"
    get: (varName) ->
        vartin = @varlist[varName]
        if vartin != null and vartin != undefined
            vartin = vartin.end_of_chain()
        if not vartin?
            throw "Variable #{varName} not in this tin"
        else if not vartin.node? or vartin.node == null
            return new Variable(vartin.name)
        else if vartin.node instanceof Box
            return unboxit(vartin.node,vartin.varlist)
        else if vartin.node instanceof Variable
            return unboxit(vartin.node,vartin.varlist)
        else if types.isArray(vartin.node)
            return map(vartin.node, (n)->unboxit(n,vartin.varlist))
        else
            throw "Unknown type in get"
    getAll: () ->
        j = {}
        for key of @varlist
            j[key] = @get(key) if !isHiddenVar key
        return j
    unbox: () ->
        unboxit @node
    unify: (tin) ->
        changes = []
        if !(tin instanceof Tin) then tin = box(tin)
        success = _unify(@node, @varlist, tin.node, tin.varlist, changes)
        if success
            @changes.push.apply(@changes, changes) #concat in place
            tin.changes.push.apply(tin.changes, changes) #concat in place
            return [this, tin]
        else return null
    rollback: () ->
        map(@changes, (change)->change())
        @changes.splice(0, @changes.length) #clear changes
        

boxit = (elem,tinlist) ->
    if elem instanceof Variable
        tinlist?[elem.name] =  new Tin( elem.name, null, null )
        return elem
    else if elem instanceof Box
        return elem
    else if types.isArray elem
        return map(elem, (i)->boxit(i,tinlist))
    else if types.isObj elem
        a = []
        for key of elem
            a.push( [boxit(key,tinlist), boxit(elem[key],tinlist)] )
        a.push(DICT_FLAG)
        return a.sort()
    else if types.isValueType elem or elem == null
        return new Box elem
    else
        throw "Don't understand the type of elem"

# Unbox the result and get back plain JS
unboxit = (tree, varlist) ->
    if types.isArray tree
        if tree[tree.length-1] == DICT_FLAG # TODO: Check bounds
            hash = new Object()
            for e in tree[0...tree.length-1]
                hash[unboxit(e[0])] = unboxit(e[1])
            return hash
        else
            return map(tree, (i)->unboxit(i))
    else if tree instanceof Box
        return tree.value
    else if tree instanceof Variable
        if varlist != undefined
            try
                tin = get_tin(varlist,tree)
            catch error # Is unbound
                return tree
            return unboxit(tin.node,tin.varlist)
        else
            return tree
    else
        throw "Unrecognized type '#{typeof(tree)}' in unbox"

# create the relevant tins
box = (elem) ->
    ### This function boxes an object. Before an object can be processed it must be "boxed" this consits of wrapping all value types in objects and converting all objects to arrays. ###
    if elem instanceof Tin then return elem
    tinlist = {}
    tree = boxit(elem,tinlist)
    return new Tin( null, tree, tinlist )

get_tin = (varlist,node) ->
    throw "Node must be a Variable to get_tin" if not node instanceof Variable
    return varlist[node.name] if varlist?[node.name]?
    throw "Couldn't find node #{node.name} in varlist #{varlist}"

bind = (t,node,varlist,changes) ->
    t = t.end_of_chain()
    return false if not t.isfree()
    t.node = node
    t.varlist = varlist
    called = false
    changes.push(() ->
        if called then return
        called = true
        t.node = null
        t.varlist = null
        t.chainlength = 1
        return
    )

bind_tins = (t1,t2,changes) ->
    if not t1.isfree() and not t2.isfree()
        return false
    else if t1.isfree() and not t2.isfree()
        return bind(t1,t2.node,t2.varlist,changes)
    else if not t1.isfree() and t2.isfree()
        return bind(t2,t1.node,t1.varlist,changes)
    else if t2.chainlength < t1.chainlength
        t2.chainlength += 1
        return bind( t2, null, t1, changes )
    else
        t1.chainlength += 1
        return bind( t1, null, t2, changes )

_unify = (n1,v1,n2,v2,changes=[]) ->
    return true if n1 == undefined and n2 == undefined
    return true if n1 == null and n2 == null
    return false if n1 == null or n2 == null
    if n1 instanceof Variable and n2 instanceof Variable
        t1 = get_tin(v1, n1)
        t2 = get_tin(v2, n2)
        if not bind_tins(t1,t2,changes)
            return false if not _unify(t1.node, t1.varlist, t2.node, t2.varlist, changes)
    else if n1 instanceof Variable
        t1 = get_tin(v1,n1)
        if not bind(t1, n2, v2, changes)
            return false if not _unify(t1.node,t1.varlist,n2,v2, changes)
    else if n2 instanceof Variable
        t2 = get_tin(v2,n2)
        if not bind(t2, n1, v1, changes)
            return false if not _unify(t2.node,t2.varlist,n1,v1, changes)
    else
        if n1 instanceof Box and n2 instanceof Box and types.isValueType(n1.value) and types.isValueType(n2.value)
            return n1.value == n2.value
        else if types.isArray(n1) and types.isArray(n2)
            return false if n1.length != n2.length
            for idx in (num for num in [0..n1.length])
                return false if not _unify(n1[idx],v1,n2[idx],v2, changes)
    return true

 # export functions so they are visible outside of this file
 extern "box", box
 extern "variable", (name)->new Variable(name)
 extern "Tin", Tin
 extern "Box", Box
 extern "DICT_FLAG", DICT_FLAG
 extern "toJson", toJson
 extern "Variable", Variable
 extern "types", types
