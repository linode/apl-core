# Helmfile dependencies

Maurice:

Helmfile releases can specify a list of dependencies (with `needs: []`), which will be installed first. This allows for proper installs of grouped releases, and also proper uninstall.
