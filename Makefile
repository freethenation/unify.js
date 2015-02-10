PATH  := node_modules/.bin:$(PATH)
SHELL := /bin/bash

.PHONY: all clean test

all: lib/unify.js lib/unify.min.js test

clean:
	rm -rf lib

test: lib/unify.js
	coffee tests/tests.coffee

lib/%.min.js: lib/%.js
	uglifyjs -cmo $@ $^

lib/%.js: src/%.coffee
	coffee -co $(dir $@) $<