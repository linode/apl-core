
This folder contains the initialy needed resuoces for the tty service impementation.

  

In order to test this POC follow the steps below:

  

- Create 3 env variables:

  -  `export TEAM=demo`
  - `export FQDN=192.168.64.101.nip.io`
  - `export TLS_SECRET_NAME=$(echo $FQDN|tr '.' '-')` 
- From inside the manifests folder generate a single manifest by also substituting the vaues
	- `envsubst '$TEAM, $FQDN, $TLS_SECRET_NAME' < tty-* > ttyd.yaml`
- Create the resources
	- `kubectl apply -f ttyd.yaml`
- Delete the existing VirtualService (called  ex. `tty-192-168-64-101.nip.io`) in tea admin otherwise it will cause a 404  when trying to reach the tty after login
- Add a new host (ex. `tty.159.223.242.50.nip.io`) in the team-dev-public-tlsterm Gateway resource to match the host in the VirtualService