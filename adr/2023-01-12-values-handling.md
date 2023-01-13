# Values handling now delegated to core server

Maurice:

**Background:**

We had both core and api do similar tricks to deal with values and secrets, which were biting each other.

**Change introduced:**

The core server now has a `read` and `update` handler for otomi-api to delegate reading and updating values.
