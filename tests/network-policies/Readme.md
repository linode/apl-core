# Testing network policies

The `env` dir contains test values for `Internal ingress filtering` and `External egress filtering` scenarios.
Those values can be synced with `values repo` by performing the following command:

```
rsync -r tests/network-policies/ <values-repo/>
```

To deploy connectivity tests perform:

```
helmfile -f helmfile.tpl/helmfile-connectivity.yaml apply
```

Next observe Pod status:

```
watch 'kubectl get pods -l module=connectivity,type=client -A --sort-by=metadata.name'
```

```
The Pod status 'Running' means that client is still attempting to reach out target
The Pod status 'NotReady' means that connection has succeded and container exited code of 0
The Pod status 'Error' means that connection did not succeded thus network policy denies traffic
```

Delete connectivity test Pods

```
helmfile -f tests/network-policies/helmfile-connectivity.yaml destroy --args=--wait
```

# Tests

## Test 1

| team/enabled | Internal ingress filtering | External egress filtering |
| ------------ | -------------------------- | ------------------------- |
| team-a1      | enabled                    | enabled                   |
| team-a2      | enabled                    | enabled                   |

Expected Pod status:

```
NAMESPACE   NAME                                           READY   STATUS     RESTARTS   AGE
team-a1     client-c1-team-a1-to-s1-team-a1                2/3     NotReady   0          3h3m
team-a2     client-c1-team-a2-to-s1-team-a1                2/3     NotReady   0          3h3m
team-a1     client-c2-team-a1-to-s2-team-a1                2/3     NotReady   0          3h3m
team-a2     client-c2-team-a2-to-s2-team-a1                2/3     Error      0          3h3m
team-a1     client-c3-team-a1-to-s3-team-a1                2/3     Error      0          3h3m
team-a2     client-c3-team-a2-to-s3-team-a1                2/3     NotReady   0          3h3m
team-a1     client-c4-team-a1-to-s4-team-a1                2/3     Error      0          3h3m
team-a2     client-c4-team-a2-to-s4-team-a1                2/3     Error      0          3h3m
team-a1     client-c5-team-a1-to-s5-team-a1                2/3     NotReady   0          3h3m
team-a2     client-c5-team-a2-to-s5-team-a1                2/3     NotReady   0          3h3m
team-a1     client-c6-team-a1-to-s6-team-a1                2/3     NotReady   0          3h3m
team-a2     client-c6-team-a2-to-s6-team-a1                2/3     Error      0          3h3m
team-a1     client-c6b-team-a1-to-s6-team-a1               2/3     Error      0          3h3m
team-a1     client-c7-team-a1-to-s7-00001-team-a1          2/3     NotReady   0          3h3m
team-a2     client-c7-team-a2-to-s7-00001-team-a1          2/3     Error      0          3h3m
team-a1     client-ce1-team-a1-https-116-203-255-68        2/3     NotReady   0          3h3m
team-a1     client-ce1-team-a1-https-httpbin-org-headers   2/3     NotReady   0          3h3m
team-a1     client-ce1-team-a1-https-otomi-io              2/3     Error      0          3h3m
team-a2     client-ce1-team-a2-https-116-203-255-68        2/3     Error      0          3h3m
team-a2     client-ce1-team-a2-https-httpbin-org-headers   2/3     Error      0          3h3m
team-a2     client-ce1-team-a2-https-otomi-io              2/3     Error      0          3h3m
```

## Test 2

| team/enabled | Internal ingress filtering | External egress filtering |
| ------------ | -------------------------- | ------------------------- |
| team-a1      | disabled                   | enabled                   |
| team-a2      | enabled                    | enabled                   |

Expected Pod status:

```
NAMESPACE   NAME                                           READY   STATUS     RESTARTS   AGE
team-a1     client-c1-team-a1-to-s1-team-a1                2/3     NotReady   0          3m29s
team-a2     client-c1-team-a2-to-s1-team-a1                2/3     NotReady   0          3m29s
team-a1     client-c2-team-a1-to-s2-team-a1                2/3     NotReady   0          3m29s
team-a2     client-c2-team-a2-to-s2-team-a1                2/3     NotReady   0          3m29s
team-a1     client-c3-team-a1-to-s3-team-a1                2/3     NotReady   0          3m29s
team-a2     client-c3-team-a2-to-s3-team-a1                2/3     NotReady   0          3m30s
team-a1     client-c4-team-a1-to-s4-team-a1                2/3     NotReady   0          3m29s
team-a2     client-c4-team-a2-to-s4-team-a1                2/3     NotReady   0          3m29s
team-a1     client-c5-team-a1-to-s5-team-a1                2/3     NotReady   0          3m29s
team-a2     client-c5-team-a2-to-s5-team-a1                2/3     NotReady   0          3m29s
team-a1     client-c6-team-a1-to-s6-team-a1                2/3     NotReady   0          3m30s
team-a2     client-c6-team-a2-to-s6-team-a1                2/3     NotReady   0          3m29s
team-a1     client-c6b-team-a1-to-s6-team-a1               2/3     NotReady   0          3m30s
team-a1     client-c7-team-a1-to-s7-00001-team-a1          2/3     NotReady   0          3m29s
team-a2     client-c7-team-a2-to-s7-00001-team-a1          2/3     NotReady   0          3m30s
team-a1     client-ce1-team-a1-https-116-203-255-68        2/3     NotReady   0          3m30s
team-a1     client-ce1-team-a1-https-httpbin-org-headers   2/3     NotReady   0          3m29s
team-a1     client-ce1-team-a1-https-otomi-io              2/3     Error      0          3m29s
team-a2     client-ce1-team-a2-https-116-203-255-68        2/3     Error      0          3m29s
team-a2     client-ce1-team-a2-https-httpbin-org-headers   2/3     Error      0          3m30s
team-a2     client-ce1-team-a2-https-otomi-io              2/3     Error      0          3m30s
```

## Test 3

| team/enabled | Internal ingress filtering | External egress filtering |
| ------------ | -------------------------- | ------------------------- |
| team-a1      | disabled                   | disabled                  |
| team-a2      | enabled                    | enabled                   |

Expected Pod status:

```
NAMESPACE   NAME                                           READY   STATUS     RESTARTS   AGE
team-a1     client-c1-team-a1-to-s1-team-a1                2/3     NotReady   0          103s
team-a2     client-c1-team-a2-to-s1-team-a1                2/3     NotReady   0          103s
team-a1     client-c2-team-a1-to-s2-team-a1                2/3     NotReady   0          102s
team-a2     client-c2-team-a2-to-s2-team-a1                2/3     NotReady   0          102s
team-a1     client-c3-team-a1-to-s3-team-a1                2/3     NotReady   0          102s
team-a2     client-c3-team-a2-to-s3-team-a1                2/3     NotReady   0          103s
team-a1     client-c4-team-a1-to-s4-team-a1                2/3     NotReady   0          102s
team-a2     client-c4-team-a2-to-s4-team-a1                2/3     NotReady   0          102s
team-a1     client-c5-team-a1-to-s5-team-a1                2/3     NotReady   0          102s
team-a2     client-c5-team-a2-to-s5-team-a1                2/3     NotReady   0          102s
team-a1     client-c6-team-a1-to-s6-team-a1                2/3     NotReady   0          102s
team-a2     client-c6-team-a2-to-s6-team-a1                2/3     NotReady   0          102s
team-a1     client-c6b-team-a1-to-s6-team-a1               2/3     NotReady   0          103s
team-a1     client-c7-team-a1-to-s7-00001-team-a1          2/3     NotReady   0          102s
team-a2     client-c7-team-a2-to-s7-00001-team-a1          2/3     NotReady   0          102s
team-a1     client-ce1-team-a1-https-116-203-255-68        2/3     NotReady   0          102s
team-a1     client-ce1-team-a1-https-httpbin-org-headers   2/3     NotReady   0          102s
team-a1     client-ce1-team-a1-https-otomi-io              2/3     NotReady   0          102s
team-a2     client-ce1-team-a2-https-116-203-255-68        2/3     Error      0          102s
team-a2     client-ce1-team-a2-https-httpbin-org-headers   2/3     Error      0          103s
team-a2     client-ce1-team-a2-https-otomi-io              2/3     Error      0          102s
```
