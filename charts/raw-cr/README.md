# raw-cr

Simple wrapper chart that can only take one single resource. 

## Rationale

When deploying CRs for operators, the original `raw` chart is incapable of allowing value overrides since it deals with arrays of configuration. However, since we don't want to introduce a custom chart for every CR we need this construct.