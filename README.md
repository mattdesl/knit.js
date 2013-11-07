knit.js
=======

Knit is a simple JavaScript Verlet physics engine for fabric and cloth effects

# Live demo

http://mattdesl.github.io/knit.js/demos/index.html

# Running the demos

First you need to make sure beefy and browserify is installed.

```
npm install beefy -g
npm install browserify -g
```

It's nice to get LiveReload for development, too:
https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei?hl=en


Then you serve up the demo like so:

```
cd knit.js
beefy src/simple.js 8080 --live --cwd demos -- --require './lib/index.js:knit'
```

Open `localhost:8080` in your browser to see the demo. Changing the JS file should refresh the browser page. 