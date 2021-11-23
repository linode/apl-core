# Tasks

To run a task in the tools container, from otomi-core run:

```bash
otomi task -n copyCerts -vv
```

If you wish to run a task locally (not only faster, but also allows for debugging), just set `OTOMI_DEV=1`. Please check out the provided VSCode profiles for debugging as that speeds up development.
Be aware that running scripts on the host (not in the container) requires that the binaries required by the execution path are installed locally. If you get errors about missing binaries, just install them (google it if unsure). The linux versions of the binaries are installed in the container, so take a look at the Dockerfile for reference.

Leaving `OTOMI_DEV` unset will make the task run in the container so you don't have to install any binaries.
