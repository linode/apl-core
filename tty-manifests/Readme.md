
This folder contains the initialy needed resuoces for the tty service impementation.

  

In order to test this POC follow the steps below:

  

- Create 3 env variables:

  - `export TEAM=admin`
  - `export FQDN=192.168.64.101.nip.io`
  - `export SUB=$(echo $RANDOM)` 
- From inside the manifests folder generate a single manifest by also substituting the vaues
	- `envsubst '$TEAM, $FQDN, $SUB' < tty-* > ttyd.yaml`
- Create the resources
	- `kubectl apply -f ttyd.yaml`

*Note: In case we will deploy to the an other namespace than admin, we need to modify the `team-admin-public-tlsterm` istio gateway to allow virtualservices from other namespaces to use it(at the moment it allows only from team-admin).