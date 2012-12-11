str=(obj)->
    if obj == null then "null"
    else if typeof obj == "undefined" then "undefined"
    else obj.toString()

class Test
    constructor:(@name, @func)->
        @num = 0
    expect:(num)->
        @num = num
    equal:(arg1, arg2)->
        @num--
        if arg1 != arg2 then throw "'#{str(arg1)}' does not equal '#{str(arg2)}'"
    ok:(bool)->
        @num--
        if not bool then throw "false was passed to ok"
    done:()->
        if @num != 0 then throw "#{str(@num)} more checks were expected before done was called"
    run:()->
        @func.call(this)
        
test=(name, func)->
    t = new Test(name, func)
    exports[name]=()->t.run()

exports.RunAll = ()->
    for name of exports
        if name != "RunAll"
            try
                exports[name]()
            catch ex
                console.log "Error in Test '#{name}'"
                console.log ex
                console.log ''
    return

unify=require("../lib/unify")

#test "Basic", ()->
#    steps = []
#    steps.push (step, err)=>
#        callMeBack(step.next, 1, 2, 3)
#    steps.push (step, err)=>
#        callMeBack(step.next)
#    funcflow(steps, @done)