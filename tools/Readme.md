# Building linode/apl-tools container image

```
docker build . -f Dockerfile -t linode/apl-tools:<TAG>
```

# Building linode/apl-tools-db container image

```
docker build . -f Dockerfile-db -t linode/apl-tools-db:<TAG>
```

# Building linode/apl-tools-tty container image

```
docker buildx build --platform linux/amd64 . -f Dockerfile-tty -t linode/apl-tools-tty:<TAG>
```
