# protractor-istanbul-plugin
[![Build Status](https://travis-ci.org/bennyhat/protractor-istanbul-plugin.svg)](https://travis-ci.org/bennyhat/protractor-istanbul-plugin) [![Coverage Status](https://coveralls.io/repos/bennyhat/protractor-istanbul-plugin/badge.svg?branch=master&service=github)](https://coveralls.io/github/bennyhat/protractor-istanbul-plugin?branch=master)

Protractor plugin that collects istanbul coverage results from a page and dumps them to coverage.json files (one per spec).

## what
This plugin will gather JavaScript coverage details for each spec executed by protractor and dump them to a json file for further processing by istanbul.

### caveats and other details:
- Due to the way that protractor hooks into the test structure while sharding, it simply creates one coverage file per spec, rather than an lcov.info file (or html, etc.).
- It is expected that the site being tested will already have istanbul-instrumented JavaScript hosted on it. There are several ways to do this. For instance, my particular use case utilizes [browserify-istanbul](https://www.npmjs.com/package/browserify-istanbul) to do this in a gulp build farther up in the build chain.
- For additional flexibility, the plugin does not expect the instrumented JavaScript site to have a coverage port open or anything fancy: it justs grabs the ```__coverage__``` object off of the page after a spec and stores that in a JSON file.
- With a little guidance, it can also preserve the ```__coverage__``` object across function calls that might remove it, such as history clears and server side navigation.

## how
### basic
If you just need to get it running and dumping json files to its default output directory of ./coverage then you can add it into your protractor configuration file like this (path is used b/c sometimes protractor can be a bit flaky with actually just using the ```package``` option):
```js
  ...
  exports.config = {
    ...
    plugins : [{
      path: 'node_modules/protractor-istanbul-plugin'
    }],
    ...
```
When it has completed it will have written one json file per spec to ./coverage. The files will be named with uuid.v4 strings. These files can then be bundled into an lcov.info file and html report using istanbul:
```bash
istanbul report --include=coverage/*.json
```

### logging and assertions
If you would like it to log any failures from trying to gather coverage data, then you can turn that on using the ```logAssertions``` option:
```js
  ...
 plugins : [{
    path: 'node_modules/protractor-istanbul-plugin',
    logAssertions: true
  }],
  ...
```

If you would like it to actually fail the tests if coverage data was not gathered, then you can turn that on using the ```failAssertions``` option (it's a good idea to turn on the logging too, in this case):
```js
  ...
 plugins : [{
    path: 'node_modules/protractor-istanbul-plugin',
    logAssertions: true,
    failAssertions: true
  }],
  ...
```

### edges cases
In some cases, the coverage data can get removed by test actions, such as history clears and server side navigation. To get around this, the plugin is able to accept an array of slightly modified functions that it will wrap with coverage preservation. Each function that gets wrapped needs to have two extra properties (until I can find a less janky way of doing it): ```boundParent```, the function's expected parent object during regular test calls, and ```boundName```, the function name that it will be stored under for the parent object.
```js
...
// minor fix-up of the wrappable functions
commonTestUtils.clearHistory.boundParent = commonTestUtils;
commonTestUtils.clearHistory.boundName = 'clearHistory';
...
  plugins : [{
    path: 'node_modules/protractor-istanbul-plugin',
    functions: [ commonTestUtils.clearHistory ]
  }],
...
// afterwards a jasmine test runs in tests/someSpec.js
...
describe('my spec', function () {
  ...
  searchButton.click();
  expect(searchResultMessage).toBe('something');
  commonTestUtils.clearHistory();
  ...
}
...
```

Now, when the commonTestUtils.clearHistory function gets called by a spec, the plugin will first store the ```__coverage__``` object into memory, then call clearHistory, then restore ```__coverage__``` from memory back onto the page for gathering later after the full spec has finished. NOTE: this should rarely have to be used unless your test setup has some pretty entrenched problems.

### all options
Here are all of the options, along with their associated defaults:
- ```outputPath``` - where the coverage json files will be stored. Default: "coverage"
- ```enabled``` - whether or not the plugin is enabled (yeah, there was use case for this). Default: true
- ```failAssertions``` - whether or not to fail tests if coverage gathering failed. Default: false
- ```logAssertions``` - whether or not to display coverage failure messages after each spec. Default: false
- ```functions``` - an array of functions to wrap with coverage preserving actions. Default: []

## why
There are a few tools out there that kind of fill this niche, namely the [grunt-protractor-coverage](https://github.com/r3b/grunt-protractor-coverage) tool, which makes similar assumptions about istanbul already being run, etc. 

However, the protractor-istanbul-plugin was written with the following needs in mind:
- web server hosting the instrumented files can be anything/anywhere: it doesn't have to be a node app that has coverage middleware running. Ex. in my main use case for this, the tech stack for hosting the instrumented JS was pretty much locked in as Apache (it is doing reverse proxy to the REST layer, etc., so it can't easily be replaced), which (to my knowledge) can't assist in terms of providing a coverage port.
- this simply produces json files rather than a full lcov.info file or html folder structure, as the protractor plugin spec hooks vary in scope between sharded and non-sharded setups.

## misc. and TODO
This is confirmed to work with Protractor v2.1.0. 

As for future plans:
- Add option for coverage gathering timeout. There is one edge case I've been fighting where timed out specs hang protractor infinitely if sharding is enabled.
