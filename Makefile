PATH  := node_modules/.bin:$(PATH)
SHELL := /bin/bash

coffee_files    := $(wildcard src/*.coffee)
js_files     := $(source_files:%.coffee=lib/%.js)

.PHONY: all clean test

all: lib/unify.js lib/unify.min.js test

clean:
	rm -rf lib

test:
	coffee tests/tests.coffee

lib/%.min.js: lib/%.js
	uglifyjs -cmo $@ $^

lib/%.js: src/%.coffee
	coffee -co $(dir $@) $<