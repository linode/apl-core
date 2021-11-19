Maurice:

For tasks, which are imported statically, we had to lazily use envalids parsing mechanism to be able to do late parsing. Extra flags were introduced to the `cleanEnvironment` function, so that it now is possible to only validate partial specs, and tell it to return a wrapper function instead of parsing immediately.

I also added a mechanism to let otomi load the contents of a local `.env` file, to support devs in setting env vars needed to run tasks locally.
