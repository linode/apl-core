# BATS testing framework

This document is relevant starting from [v0.11.52](https://github.com/redkubes/otomi-core/releases/tag/v0.11.52).

## Where can I find BATS?

The otomi/tools:1.4.10 includes the [bats framework](https://github.com/bats-core/bats-core), including libraries [bats-assert](https://github.com/ztombol/bats-assert), [bats-file](https://github.com/ztombol/bats-support) and [bats-support](https://github.com/ztombol/bats-support). These links include relevant documentation, such as syntax, which won't be discussed on this page.

Example of calling the binary:

`docker run --rm otomi/tools:1.4.10 bats bin/tests`

This example command assumes that tests are found in the container directory `otomi-core/bin/tests`. You can call bats with a directory as parameter and it will execute any file with the .bats extension. Note that these files can be found in the container directory \$WORKDIR/bin/tests.

## How should I add tests?

Test files should have the .bats extension, otherwise they will not be executed.

## How should I name the test files?

First of all, use the .bats file extension. Include at least one of names used in the Shell Scripts you're testing.

Example with a bootstrap.sh file:

`bootstrap.bats`

## How do I use the BATS libraries?

In the Dockerfile, they will be available in `/usr/local/lib/bats-*`. Use these commands to call the libraries to include them in the test file:

```
lib_dir="/usr/local/lib"

load "$lib_dir/bats-support/load.bash"
load "$lib_dir/bats-assert/load.bash"
load "$lib_dir/bats-file/load.bash"
```
