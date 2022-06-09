# Ingress classes

Jehoszafat:

To allow network segmentation of the ingress a user can define new ingress classes.

- An ingress class can be private or public, meaning either a public or private load balancer is used.
- Each ingress class is associated with a distinct ingress controller
- Each ingress controller is associated with either public or private IP address
- There is always the `platform` ingress class defined `otomi.ingress.platform`
- It is possible to define additional ingress classes at `otomi.ingress.classes`
- All otomi services are by default exposed behind the `platform` ingress class

Since Keycloak is integrated to provide authentication to the platform services, we decided that it will not be available for team services anymore. This clear separation of concerns reduces surface attacks on the platform and provides more flexibility in terms of defining authentication policies for platform and business applications.

To enable source IP filtering it is possible to define CIDRs at `sourceIpAddressFiltering` property for each ingress class.

To stay consistent with the design of ingress classes the old `nginx-ingress` helm release will be removed (if exists) whenever `otomi apply` command is called. See: `helmfile.d/helmfile-00.uninstall.yaml`.
