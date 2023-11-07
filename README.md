This project actually morphed into something that is more of a testground for me to develop all sort of things.
Currently, the main focus is on the custom canvas web component that does camera movements and physics simulation that I plan to use in 
future projects that involve those things.

## Usage

Originally this is the web component library that I plan to use for my future frontend projects. However, things
does not always go as planned. I had rollup set up for the components that I developed for other projects to import
and published the transpiled code on to npm. Since I don't really have great documentation for this project, I figure
it would be of little use to anyone. Currently I am focusing on customizing the existing canvas element so it can be used
as "canvas" with pan and zoom, and also rotation. I have paired it with a very rudimentary physics simulation system. 
If you want to play around with it just follow the steps below.

After cloning the repo, change into the directory and install the dependencies
```
    npm install
```

I have only "build" and "dev" script setup in package.json. Build is not really that useful right now.
To try out the canvas demo just run
```
    npm run dev
```

Webpack will spin up a dev server; just go to the prompted port in your browser and give it a try.