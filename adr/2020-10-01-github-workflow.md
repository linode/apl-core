# Our GitHub workflow

Maurice:

We use `commitizen` and `standard-version` to create meaningful and functional commit messages that allow for releasing of predictable version tags.
We did deviate from the "version and tag" way that `standard-version` offers. Reasons behind that are efficiency, less error and speed. Why?

The suggested `npm run release` workflow does this:

- bumps the version in package.json and adds a new commit to master
- it adds a git tag (which is preferred imo, but it is possible to turn this off in the config)
- you then push it with `--follow-tags`

## Issues with suggested setup

### 1. Unnecessary double trigger of github workflow

We used this for a while but immediately noticed this was always resulting in two GitHub workflow triggers: one for master, and one for the tag. So always two actions triggered by one commit hash doing the same work. Not nice. Whatever exclusion logic we gave to the workflow, it would not stop on one or the other. GitHub received many reports about this but there was no progress there, so we came up with our own setup.

### 2. Human error possible

Since the developer has to push with `--follow-tags` it is just a matter of waiting for the moment that this flag is not added, resulting in a bump in version and humans expecting a release to be published to the image registry. But guess what: computer said no.

## Chosen solution

To circumvent the above mentioned issues we came up with the current workflow.
Our chosen way of releasing is title based on the git message title: if (on master and msg ~ `chore(release): 1.1.1`) then build and push that tag (also as `latest`)

Added benefits:

### 1. Better logic/reliability/consistency

- We now also have the guarantee that the tag and release were authorized by the pipeline logic (no human decision possible) in a consistent manner,
- and are created atomically, so tightly coupled to the artifacts being tested (everything checked in the same run, so no discrepancy possible between bumped version commits and tag events)

### 2. Better performance

Since we just want to test one final time if our bumped version is passing the tests, we might as well then tag and release it in that same pipeline instead of delegating it to yet another (possibly human driven) tag event triggering another run of the same work.
