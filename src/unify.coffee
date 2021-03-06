# utils
if typeof module == 'undefined' then window.unify={}
extern=(name, o)->if typeof module == 'undefined' then window.unify[name] = o else module.exports[name] = o
str=(o)->
    if typeof o == "undefined" then return "undefined"
    else if o==null then return "null"
    else return o.toString()
map=(arr, func)->(func(i) for i in arr)

# type testing functions
types = {
    isUndef: (o) -> typeof o == "undefined"
    isBool: (o) -> typeof o == "boolean"
    isArray: (o) -> o? && Array.isArray o
    isStr: (o) -> typeof o == "string"
    isNum: (o) -> typeof o == "number" && !isNaN(o)
    isObj: (o) -> o != null and not types.isArray(o) and typeof o == "object"
    isValueType: (o) -> types.isBool(o) or types.isStr(o) or types.isNum(o)
    isFunc: (o) -> !!(o && o.constructor && o.call && o.apply)
    isInt: (o) -> isNum(o) && o == Math.floor(o)
}
types[k].maxDepth = 1 for k of types

# util function to convert data types to strings
toJson=(elem)->
    if types.isArray(elem)
        return "[#{ map(elem, (i)->toJson(i)).join() }]"
    if types.isStr(elem)
        return "\"#{ elem }\""
    ret = str(elem)
    if types.isObj(elem) and ret == "[object Object]"
        return "{#{ (( e + ':' + toJson(elem[e])) for e of elem).join() }}"
    return ret

# metadata to indicate this was a dictionary
class DictFlag
    toString: () -> "DICT_FLAG"
DICT_FLAG = new DictFlag()

class Box
    constructor: (v) ->
        if types.isValueType(v) || v == null
            @value = v
        else
            throw "Can only box value types, not #{ toJson v }"
    toString: () -> toJson(@value)

g_hidden_var_counter = 1
HIDDEN_VAR_PREFIX = "__HIDDEN__"
isHiddenVar = (name) -> name.substring(0,HIDDEN_VAR_PREFIX.length) == HIDDEN_VAR_PREFIX
class Variable
    constructor: (name, @typeFunc=null) ->
        @isListVar = name[0] == "$"
        if @isListVar then name = name.substring(1)
        if name == "_"
            @name = HIDDEN_VAR_PREFIX + g_hidden_var_counter
            g_hidden_var_counter += 1
        else
            @name = name
    isHiddenVar: () -> isHiddenVar @name
    toString: () -> "Variable(#{ toJson @name })"
  
class TreeTin
    constructor: (@node, @varlist)->
        @changes = []
    toString: () -> toJson(@node)
    get: (varName, maxDepth)->
        vartin = @varlist[varName]
        if not vartin then throw "Variable #{varName} not in this tin"
        vartin = vartin.endOfChain()
        if not vartin.node
            return new Variable(vartin.name)
        else
            return unboxit(vartin.node, vartin.varlist, maxDepth)
    getAll: (maxDepth) ->
        j = {}
        for key of @varlist
            j[key] = @get(key, maxDepth) if !isHiddenVar key
        return j
    unbox: (maxDepth) ->
        unboxit @node, @varlist, maxDepth
    unify: (tin) ->
        changes = []
        if !(tin instanceof TreeTin) then tin = box(tin)
        success = _unify(@node, @varlist, tin.node, tin.varlist, changes)
        if success
            @changes.push.apply(@changes, changes) #concat in place
            @changes.push.apply(tin.changes, changes) #concat in place
            return [this, tin]
        else
            map(changes, (change)->change())
            return null
    bind: (varName, expr) ->
        vartin = @varlist[varName].endOfChain()
        if not vartin.isfree() then return null
        if !(expr instanceof TreeTin) then expr = box(expr)
        changes = []
        if(bind(vartin, expr.node, expr.varlist, changes))
            @changes.push.apply(@changes, changes) #concat in place
            @changes.push.apply(expr.changes, changes) #concat in place
            return [this,expr]
        return null
    rollback: () ->
        map(@changes, (change)->change())
        @changes.splice(0, @changes.length) #clear changes
        return
            
class VarTin
    constructor: (@name, @node=null, @varlist=null, @typeFunc=null) ->
        @chainlength = 1
    endOfChain: () ->
        t = this
        t = t.varlist while t.varlist instanceof VarTin
        return t
    isfree: () ->
        t = @endOfChain()
        return t.node == null and t.varlist == null
    isHiddenVar: () -> isHiddenVar @name
    toString:() -> "VarTin(#{ toJson @name })"
    unbox: (maxDepth) ->
        if @node then return unboxit(@node, @varlist, maxDepth) else return new Variable(@name)
        
# Unbox the result and get back plain JS
unboxit = (tree, varlist, maxDepth=-1) ->
    if maxDepth==0 then return tree
    if types.isArray tree
        if tree.length > 0 and tree[tree.length-1] == DICT_FLAG
            hash = new Object()
            for e in tree[0...tree.length-1]
                hash[unboxit(e[0], varlist, maxDepth-1)] = unboxit(e[1], varlist, maxDepth-1)
            return hash
        else
            return map(tree, (i)->unboxit(i,varlist, maxDepth-1))
    else if tree instanceof Box
        return tree.value
    else if tree instanceof Variable
        if varlist != undefined
            try
                tin = get_tin(varlist,tree)
            catch error # Is unbound
                return tree
            if tin.node? and tin.varlist?
                return unboxit(tin.node,tin.varlist, maxDepth-1)
            else
                return tree
        else
            return tree
    else
    throw "Unrecognized type '#{typeof(tree)}' in unbox."
        
boxit = (elem, varlist) ->
    if elem instanceof Variable
        if varlist[elem.name]?
            if elem.typeFunc? and varlist[elem.name].typeFunc?
                throw "A single variable can not be defined with two diffrent types!" if elem.typeFunc != varlist[elem.name].typeFunc
            else if elem.typeFunc?
                varlist[elem.name].typeFunc = elem.typeFunc
        else
            varlist[elem.name] =  new VarTin( elem.name, null, null, elem.typeFunc)
        return elem
    else if elem instanceof Box
        return elem
    else if types.isArray elem
        hasListVar = false
        ret = map(elem, (i)->
            if i instanceof Variable and i.isListVar
                if hasListVar then throw "There can only be one list variable in an array!"
                hasListVar = true
            return boxit(i,varlist)
        )
        ret.hasListVar = hasListVar
        return ret
    else if types.isObj elem
        a = []
        for key of elem
            a.push( [boxit(key,varlist), boxit(elem[key],varlist)] )
        a.push(DICT_FLAG)
        return a.sort()
    else if types.isValueType elem or elem == null
        return new Box elem
    else
        "Unrecognized type '#{typeof(elem)}' in box."

# create the relevant tins
box = (elem) ->
    ### This function boxes an object. Before an object can be processed it must be "boxed" this consits of wrapping all value types in objects and converting all objects to arrays. ###
    if elem instanceof TreeTin then return elem
    varlist = {}
    tree = boxit(elem,varlist)
    return new TreeTin(tree, varlist)

get_tin = (varlist,node) ->
    throw "Node must be a Variable to get_tin!" if not node instanceof Variable
    return varlist[node.name] if varlist?[node.name]?
    throw "Couldn't find node #{node.name} in varlist #{varlist}!"

# t: variableTin
# node: variableTin node
# varlist: variableTin varlist
# changes: list of changes
bind = (t, node, varlist, changes) ->
    t = t.endOfChain()
    return false if not t.isfree()
    if t.typeFunc != null
        unboxed = unboxit(node, varlist, t.typeFunc.maxDepth)
        if unboxed instanceof Variable and Variable.typeFunc != t.typeFunc
            return false
        else if not t.typeFunc(unboxed)
             return false
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
    return true

# t1: variableTin 1
# t2: variableTin 2
# changes: list of changes
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

# n1: TreeTin 1
# v1: variableList 1
# n2: TreeTin 2
# v2: variableList 2
# changes: list of changes
_unify = (n1,v1,n2,v2,changes=[]) ->
    if n1 == undefined and n2 == undefined then return true
    else if n1 == null and n2 == null then return true
    else if n1 == null or n2 == null then return false
    else if n1 instanceof Variable and n2 instanceof Variable
        t1 = get_tin(v1, n1)
        t2 = get_tin(v2, n2)
        if bind_tins(t1,t2,changes) then return true
        return _unify(t1.node, t1.varlist, t2.node, t2.varlist, changes)
    else if n1 instanceof Variable
        t1 = get_tin(v1,n1)
        if bind(t1, n2, v2, changes) then return true
        return _unify(t1.node,t1.varlist,n2,v2, changes)
    else if n2 instanceof Variable
        return _unify(n2,v2,n1,v1,changes)
    else if n1 instanceof Box and n2 instanceof Box
        return n1.value == n2.value
    else if types.isArray(n1) and types.isArray(n2)
        n1RealLength = n1.length - (if n1.hasListVar then 1 else 0)
        n2RealLength = n2.length - (if n2.hasListVar then 1 else 0)
        if n1RealLength == n2RealLength # handle the case that both list have the same real length
            if n1.hasListVar
                n1 = removeListVars(n1,v1,changes)
                if !n1 then return false
            if n2.hasListVar
                n2 = removeListVars(n2,v2,changes)
                if !n2 then return false
            idx = 0
            while idx < n1.length
                if not _unify(n1[idx],v1,n2[idx],v2,changes) then return false
                idx++
            return true
        # at this point we know the lists do not have the same length
        if n1RealLength > n2RealLength then return _unify(n2,v2,n1,v1,changes)
        # at this point n1RealLength < n2RealLength
        n2 = removeListVars(n2,v2,changes)
        if !n2 then return false
        idx1 = 0
        idx2 = 0
        while idx2 < n2.length
            if n1[idx1] instanceof Variable and n1[idx1].isListVar
                if not _unify(n1[idx1],v1,n2.slice(idx2,idx2+n2RealLength-n1RealLength),v2,changes) then return false
                idx2 += n2RealLength-n1RealLength-1
            else if not _unify(n1[idx1],v1,n2[idx2],v2,changes) then return false
            idx1++
            idx2++
        return true
    return n1 == n2
# little util function that removes list vars and binds them to []. It is used in _unify
removeListVars = (arr, varList, changes)->
    ret = []
    for i in arr
        if i instanceof Variable and i.isListVar 
            if not _unify(i,varList,[],[],changes) then return false
        else ret.push(i)
    return ret

 # export functions so they are visible outside of this file
 extern "box", box
 extern "variable", (name, typeFunc)->new Variable(name, typeFunc)
 extern "TreeTin", TreeTin
 extern "VarTin", VarTin
 extern "Box", Box
 extern "DICT_FLAG", DICT_FLAG
 extern "toJson", toJson
 extern "Variable", Variable
 extern "types", types
