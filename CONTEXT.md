# Domain Glossary

## PlatformSettings

PlatformSettings is the single source of platform-wide settings for one platform installation.

Constraints:

- Exactly one PlatformSettings exists per platform installation.

## Team

A team is the logical boundary for team-level configuration and access policy in the platform.

## PlatformTeam

PlatformTeam is the canonical resource representing one team's settings.

Constraints:

- Exactly one PlatformTeam maps to exactly one team identity.
- A PlatformTeam belongs to the platform installation represented by PlatformSettings and cannot become operational without it.
- Team-owned services, workloads, builds, code repositories, and network policies are not team settings.
- Team identity is globally unique.
- Team identity is immutable after creation.

## Primary Team Namespace

The primary team namespace is the platform-managed namespace associated with exactly one team.

## Namespace Assignment

A namespace assignment associates an additional namespace with a team. It is distinct from the team's primary namespace.

Constraints:

- Assignment does not transfer lifecycle ownership of the namespace to the team.
- Removing an assignment does not remove the namespace or its workloads.
