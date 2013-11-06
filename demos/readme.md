# Running the demos

First you need to make sure beefy and browserify is installed.

```javascript
npm install beefy -g
npm install browserify -g
```

It's nice to get LiveReload for development, too:
https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei?hl=en

```javascript
cd knit.js
cd demos
beefy src/simple.js 8080 --live -- --require '../lib/index.js:knit'
```

You can replace `src/simple.js` with another demo file in the `src` folder.

Open `localhost:8080` in your browser to see the demo. Changing the JS file should refresh the browser page.