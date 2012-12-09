# utils
log=(o)->console.log o
dir=(o)->console.dir o
len=(o)-> o.length
if typeof exports == 'undefined' then window.JSUnify={}
extern=(name, o)->if typeof exports == 'undefined' then window.JSUnify[name] = o else exports[name] = o
if typeof exports == 'undefined' then window.JSUnify.internal={} else exports.internal = {}
internal=(name, o)->if typeof exports == 'undefined' then window.JSUnify.internal[name] = o else exports.internal[name] = o
str=(o)->
    if typeof o == "undefined"
        return "undefined"
    else if o==null
        return "null"
    else
       return o.toString()
mergeJson=()->
    ret = {}
    for arg in arguments
        ret[name] = value for name, value of arg
    return ret

# type testing functions
isundef=(o) -> typeof o == "undefined"
isbool=(o) -> typeof o == "boolean"
isarray=(o) -> o? && Array.isArray o
isstr=(o) -> typeof o == "string"
isnum=(o) -> typeof o == "number"
isobj=(o) -> o!=null and not isarray(o) and typeof o == "object"
isvaluetype=(o) -> isbool(o) or isstr(o) or isnum(o)
isfunc=(o) -> !!(o && o.constructor && o.call && o.apply)

# util functions to convert various data types to strings
toJson=(elem) ->
    if isarray elem
        return "[#{ (toJson e for e in elem).join(',') }]"
    else if elem instanceof Box or elem instanceof Tin or elem instanceof Variable or elem instanceof DictFlag
        return str(elem)
    else if isobj elem
        return "{#{ (( e + ':' + toJson(elem[e])) for e of elem).join(',') }}"
    else if isstr elem
        return "\"#{ elem }\""
    else
        return str(elem)

# metadata to indicate this was a dictionary
class DictFlag
    toString: () -> "new DictFlag()"
DICT_FLAG = new DictFlag()

class Box
    constructor: (v) ->
        if isvaluetype(v) || v == null
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
    toString: () -> "Var(#{ toJson @name })"
Var=(name)->new Variable(name)

class Tin
    constructor: (name, node, varlist) ->
        @node = if node? then node else null
        @varlist = if (isobj varlist) then varlist else null
        @chainlength = 1
        @name = name
    end_of_chain: () ->
        t = this
        t = t.varlist while t.varlist instanceof Tin
        return t
#    isfree:()->!@node?
    isfree: () ->
        t = @end_of_chain()
        return t.node == null and t.varlist == null
    isHiddenVar: () -> isHiddenVar @name
    toString:() -> "new Tin(#{ toJson @name }, #{ toJson @node }, #{ toJson @varlist})"

    get: (var_name) ->
        vartin = @varlist[var_name]
        if vartin != null and vartin != undefined
            vartin = vartin.end_of_chain()

        if not vartin?
            throw "Variable #{var_name} not in this tin"
        else if not vartin.node? or vartin.node == null
            return new Var(vartin.name)
        else if vartin.node instanceof Box
            return unboxit(vartin.node,vartin.varlist)
        else if vartin.node instanceof Var
            return unboxit(vartin.node,vartin.varlist)
        else if isarray(vartin.node)
            return ( unboxit(n,vartin.varlist) for n in vartin.node )
        else
            throw "Unknown type in get"

    get_all: () ->
        j = {}
        for key of @varlist
            j[key] = @get(key) if !isHiddenVar key
        return j

    unparse: () ->
        unboxit @node

boxit = (elem,tinlist) ->
    if elem instanceof Variable
        tinlist?[elem.name] =  new Tin( elem.name, null, null )
        return elem
    else if elem instanceof Box
        return elem
    else if isarray elem
        return (boxit(item,tinlist) for item in elem)
    else if isobj elem
        a = []
        for key of elem
            a.push( [boxit(key,tinlist), boxit(elem[key],tinlist)] )
        a.push(DICT_FLAG)
        return a.sort()
    else if isvaluetype elem or elem == null
        return new Box elem
    else
        throw "Don't understand the type of elem"

# Unbox the result and get back plain JS
unboxit = (tree, varlist) ->
    if isarray tree
        if tree[tree.length-1] == DICT_FLAG # TODO: Check bounds
            hash = new Object()
            for e in tree[0...tree.length-1]
                hash[unboxit(e[0])] = unboxit(e[1])
            return hash
        else
            return (unboxit(item) for item in tree)
    else if tree instanceof Box
        return tree.value
    else if tree instanceof Variable
        if varlist != undefined
            # log varlist
            # log tree
            try
                tin = get_tin(varlist,tree)
            catch error # Is unbound
                return tree
            return unboxit(tin.node,tin.varlist)
        else
            return tree
    else
        throw "Unrecognized type '#{typeof(tree)}' in unboxit"

# create the relevant tins
parse = (elem) ->
    tinlist = {}
    tree = boxit(elem,tinlist)
    return new Tin( null, tree, tinlist )

get_tin = (varlist,node) ->
    throw "Node must be a Var to get_tin" if not node instanceof Variable
    return varlist[node.name] if varlist?[node.name]?
    throw "Couldn't find node #{node.name} in varlist #{varlist}"

bind = (t,node,varlist,changes) ->
    t = t.end_of_chain()
    return false if not t.isfree()
    t.node = node
    t.varlist = varlist
    changes.push( () -> t.node = null; t.varlist = null; t.chainlength = 1 )
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

# unification!
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
        if n1 instanceof Box and n2 instanceof Box and isvaluetype(n1.value) and isvaluetype(n2.value)
            return n1.value == n2.value
        else if isarray(n1) and isarray(n2)
            return false if n1.length != n2.length
            for idx in (num for num in [0..n1.length])
                return false if not _unify(n1[idx],v1,n2[idx],v2, changes)
    return true

unify = (expr1,expr2,changes=[]) ->
    success = true
    expr1 = if expr1 instanceof Tin then expr1 else parse(expr1)
    expr2 = if expr2 instanceof Tin then expr2 else parse(expr2)
    success = _unify(expr1.node,expr1.varlist,expr2.node,expr2.varlist,changes)
    if success == false
        return null
    else
        return [expr1,expr2]

rollback = (changes) ->
    for change in changes
        change()

 # export functions so they are visible outside of this file
 extern "parse", parse
 extern "unify", unify
 extern "Var", Var
 internal "Tin", Tin
 internal "Box", Box
 internal "DictFlag", DictFlag
 internal "toJson", toJson
 internal "Variable", Variable
 extern "rollback", rollback
