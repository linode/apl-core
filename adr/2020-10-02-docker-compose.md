Maurice:

Added docker-compose with implications: Can't mount an existing git repo to work with.
This is sad, but I've tried many hours many things to make this work. No dice.

SO DON'T TRY THIS AGAIN AND WASTE TIME HERE!!

Given that the api needs to share files with tools server, docker-compose uses host's `/tmp` as shared volume.
Api by default will use `/tmp/otomi-core` for creating it's internal git repo, so it is possible to open that in your editor:

```bash
code /tmp/otomi-core
```
