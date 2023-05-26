
This folder contains the initialy needed resuoces for the tty service impementation.

  

In order to test this POC follow the steps below:

  

- Create 3 env variables(like this example):

  - `export TARGET_TEAM=dev`
  - `export FQDN=192.168.64.101.nip.io # Replace with the FQDN provided from the  otomi job`
  - `export SUB=$(echo $RANDOM) # Random number to mock the user subject field` 
- From inside the manifests folder generate a single manifest by also substituting the vaues
	- `envsubst '$TARGET_TEAM, $FQDN, $SUB' < tty-* > ttyd.yaml`
- Create the resources
	- `kubectl apply -f ttyd.yaml`
- Test it in the browser by navigating to tty.< FQDN > (ex. `tty.192.168.64.101.nip.io/<random number generated above>` )