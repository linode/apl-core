# Ingress classes

Jehoszafat:

To allow network segmentation of the ingress a user can define new ingress classes.

1. An ingress class can be private or public, meaning either a public or private load balancer is used.
1. Each ingress class is associated with a distinct ingress controller
1. Each ingress controller is associated with either public or private IP address
1. There is always the `platform` ingress class defined `otomi.ingress.platform`
1. It is possible to define additional ingress classes at `otomi.ingress.classes`
1. All otomi services are by default exposed behind the `platform` ingress class

To allow the keycloak to serve as an authentication gateway for services exposed behind both public and private LBs, the keycloak needs to be assigned to a public ingress class. If `platform` ingress class is private, then an additional public ingress class needs to be created. A public class can be assigned to keycloak at `apps.keycloak.ingressClassName`.

To enable source IP filtering it is possible to define CIDRS at `sourceIpAddressFiltering` property for each ingress class
