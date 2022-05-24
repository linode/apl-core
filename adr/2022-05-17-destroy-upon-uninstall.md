# Extra flags to accomodate destroy upon uninstall

Maurice:

To accomodate app stores that demand resources are removed when the install chart is removed, the post-job that is ran during `helm uninstall` now first calls:

1. `otomi bootstrap --destroy` to be able to quickly reinstate values from git, and then
2. `otomi destroy` without the `--full` flag, as that flag is for devs, which also removes all CRDs deployed by Otomi
