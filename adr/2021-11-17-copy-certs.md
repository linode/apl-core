Maurice:

We had to start copying TLS secrets created by teams to the nginx' controller namespace for termination to work. We chose this solution as secrets should also remain in the team namespace for their own workloads (like for TLS passthrough).
