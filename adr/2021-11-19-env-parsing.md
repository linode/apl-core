Maurice:

For tasks, which are imported statically, we had to lazily use envalids parsing mechanism to be able to do late parsing. Extra flags were introduced to the `cleanEnvironment` function, so that it now is possible to only validate partial specs, and tell it to return a wrapper function instead of parsing immediately.
