fs = require 'fs'
funcflow = require 'funcflow'

task 'build', 'compiles src/unify.coffee to lib/unify.js', ->
    funcflow([
        (step, err)->readFile('./src/unify.coffee', step.next)
        (step, err, file)->compile(file, step.next)
        (step, err, file)->writeFile('./lib/unify.js', file, step.next)
    ], {catchExceptions:false}, ()->console.log('Compiled "unify.js"!'))

task 'build:min', 'compiles src/unify.coffee to lib/unify.js and then runs UglifyJS on it', ->
    invoke('build')
    funcflow([
        (step, err)->readFile('./lib/unify.js', step.next)
        (step, err, file)->compress(file, step.next)
        (step, err, file)->writeFile('./lib/unify.min.js',  file, step.next)
    ], {catchExceptions:false}, ()->console.log('Compiled "unify.min.js"!'))

task 'build:full', 'compiles src/unify.coffee, runs all tests, and minifies', ->
    invoke('build:min')
    
compile = (inputFile, callback) ->
        coffee = require 'coffee-script'
        callback?(coffee.compile(inputFile))

compress = (inputFile, callback) ->
    uglify = require "uglify-js"
    ast = uglify.parser.parse(inputFile); # parse code and get the initial AST
    ast = uglify.uglify.ast_mangle(ast); # get a new AST with mangled names
    ast = uglify.uglify.ast_squeeze(ast); # get an AST with compression optimizations
    callback?(uglify.uglify.gen_code(ast))
    
 readFile = (filename, callback) ->
    data = fs.readFile(filename, 'utf8', (err, data)-> if err then throw err else callback(data))
 
 writeFile = (filename, data, callback) ->
     fs.writeFile(filename, data, 'utf8', (err)-> if err then throw err else callback())
