#generate helm documentation
DOCS_IMAGE_VERSION="v1.11.0"

docs:
	docker run \
	--rm \
	--workdir=/helm-docs \
	--volume "$$(pwd):/helm-docs" \
	-u $$(id -u) \
	jnorwood/helm-docs:$(DOCS_IMAGE_VERSION) \
	helm-docs -t ./README.gotmpl -o ./README.md
