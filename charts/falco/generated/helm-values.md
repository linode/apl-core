# Configuration values for falco chart
`Chart version: v2.4.2`
## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | Affinity constraint for pods' scheduling. |
| certs | object | `{"ca":{"crt":""},"existingSecret":"","server":{"crt":"","key":""}}` | certificates used by webserver and grpc server. paste certificate content or use helm with --set-file or use existing secret containing key, crt, ca as well as pem bundle |
| certs.ca.crt | string | `""` | CA certificate used by gRPC, webserver and AuditSink validation. |
| certs.existingSecret | string | `""` | Existing secret containing the following key, crt and ca as well as the bundle pem. |
| certs.server.crt | string | `""` | Certificate used by gRPC and webserver. |
| certs.server.key | string | `""` | Key used by gRPC and webserver. |
| collectors.containerd.enabled | bool | `true` | Enable ContainerD support. |
| collectors.containerd.socket | string | `"/run/containerd/containerd.sock"` | The path of the ContainerD socket. |
| collectors.crio.enabled | bool | `true` | Enable CRI-O support. |
| collectors.crio.socket | string | `"/run/crio/crio.sock"` | The path of the CRI-O socket. |
| collectors.docker.enabled | bool | `true` | Enable Docker support. |
| collectors.docker.socket | string | `"/var/run/docker.sock"` | The path of the Docker daemon socket. |
| collectors.enabled | bool | `true` | Enable/disable all the metadata collectors. |
| collectors.kubernetes.apiAuth | string | `"/var/run/secrets/kubernetes.io/serviceaccount/token"` | Provide the authentication method Falco should use to connect to the Kubernetes API. |
| collectors.kubernetes.apiUrl | string | `"https://$(KUBERNETES_SERVICE_HOST)"` |  |
| collectors.kubernetes.enableNodeFilter | bool | `true` | If true, only the current node (on which Falco is running) will be considered when requesting metadata of pods to the API server. Disabling this option may have a performance penalty on large clusters. |
| collectors.kubernetes.enabled | bool | `true` | Enable Kubernetes meta data collection via a connection to the Kubernetes API server. When this option is disabled, Falco falls back to the container annotations to grap the meta data. In such a case, only the ID, name, namespace, labels of the pod will be available. |
| containerSecurityContext | object | `{}` | Set securityContext for the Falco container.For more info see the "falco.securityContext" helper in "pod-template.tpl" |
| controller.daemonset.updateStrategy.type | string | `"RollingUpdate"` | Perform rolling updates by default in the DaemonSet agent ref: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/ |
| controller.deployment.replicas | int | `1` | Number of replicas when installing Falco using a deployment. Change it if you really know what you are doing. For more info check the section on Plugins in the README.md file. |
| controller.kind | string | `"daemonset"` |  |
| customRules | object | `{}` | Third party rules enabled for Falco. More info on the dedicated section in README.md file. |
| driver.ebpf | object | `{"hostNetwork":false,"leastPrivileged":false,"path":null}` | Configuration section for ebpf driver. |
| driver.ebpf.hostNetwork | bool | `false` | Needed to enable eBPF JIT at runtime for performance reasons. Can be skipped if eBPF JIT is enabled from outside the container |
| driver.ebpf.leastPrivileged | bool | `false` | Constrain Falco with capabilities instead of running a privileged container. This option is only supported with the eBPF driver and a kernel >= 5.8. Ensure the eBPF driver is enabled (i.e., setting the `driver.kind` option to `ebpf`). |
| driver.ebpf.path | string | `nil` | Path where the eBPF probe is located. It comes handy when the probe have been installed in the nodes using tools other than the init container deployed with the chart. |
| driver.enabled | bool | `true` | Set it to false if you want to deploy Falco without the drivers. Always set it to false when using Falco with plugins. |
| driver.kind | string | `"module"` | Tell Falco which driver to use. Available options: module (kernel driver) and ebpf (eBPF probe). |
| driver.loader | object | `{"enabled":true,"initContainer":{"args":[],"enabled":true,"env":{},"image":{"pullPolicy":"IfNotPresent","registry":"docker.io","repository":"falcosecurity/falco-driver-loader","tag":""},"resources":{},"securityContext":{}}}` | Configuration for the Falco init container. |
| driver.loader.enabled | bool | `true` | Enable/disable the init container. |
| driver.loader.initContainer.args | list | `[]` | Arguments to pass to the Falco driver loader init container. |
| driver.loader.initContainer.enabled | bool | `true` | Enable/disable the init container. |
| driver.loader.initContainer.env | object | `{}` | Extra environment variables that will be pass onto Falco driver loader init container. |
| driver.loader.initContainer.image.pullPolicy | string | `"IfNotPresent"` | The image pull policy. |
| driver.loader.initContainer.image.registry | string | `"docker.io"` | The image registry to pull from. |
| driver.loader.initContainer.image.repository | string | `"falcosecurity/falco-driver-loader"` | The image repository to pull from. |
| driver.loader.initContainer.resources | object | `{}` | Resources requests and limits for the Falco driver loader init container. |
| driver.loader.initContainer.securityContext | object | `{}` | Security context for the Falco driver loader init container. Overrides the default security context. If driver.mode == "module" you must at least set `privileged: true`. |
| extra.args | list | `[]` | Extra command-line arguments. |
| extra.env | object | `{}` | Extra environment variables that will be pass onto Falco containers. |
| extra.initContainers | list | `[]` | Additional initContainers for Falco pods. |
| falco.buffered_outputs | bool | `false` | Whether or not output to any of the output channels below is buffered. Defaults to false |
| falco.file_output.enabled | bool | `false` | Enable file output for security notifications. |
| falco.file_output.filename | string | `"./events.txt"` | The filename for logging notifications. |
| falco.file_output.keep_alive | bool | `false` | Open file once or every time a new notification arrives. |
| falco.grpc | object | `{"bind_address":"unix:///run/falco/falco.sock","enabled":false,"threadiness":0}` | gRPC server using an unix socket |
| falco.grpc.bind_address | string | `"unix:///run/falco/falco.sock"` | Bind address for the grpc server. |
| falco.grpc.enabled | bool | `false` | Enable the Falco gRPC server. |
| falco.grpc.threadiness | int | `0` | Number of threads (and context) the gRPC server will use, 0 by default, which means "auto". |
| falco.grpc_output.enabled | bool | `false` | Enable the gRPC output and events will be kept in memory until you read them with a gRPC client. |
| falco.http_output.enabled | bool | `false` | Enable http output for security notifications. |
| falco.http_output.url | string | `""` | When including Falco inside a parent helm chart, you must set this since the auto-generated URL won't match (#280). |
| falco.http_output.user_agent | string | `"falcosecurity/falco"` |  |
| falco.json_include_output_property | bool | `true` | When using json output, whether or not to include the "output" property itself (e.g. "File below a known binary directory opened for writing (user=root ....") in the json output. |
| falco.json_include_tags_property | bool | `true` | When using json output, whether or not to include the "tags" property itself in the json output. If set to true, outputs caused by rules with no tags will have a "tags" field set to an empty array. If set to false, the "tags" field will not be included in the json output at all. |
| falco.json_output | bool | `false` | If "true", print falco alert messages and rules file loading/validation results as json, which allows for easier consumption by downstream programs. Default is "false". |
| falco.libs_logger.enabled | bool | `false` | Enable the libs logger. |
| falco.libs_logger.severity | string | `"debug"` | Minimum log severity to include in the libs logs. Note: this value is separate from the log level of the Falco logger and does not affect it. Can be one of "fatal", "critical", "error", "warning", "notice", "info", "debug", "trace". |
| falco.load_plugins | list | `[]` | Add here the names of the plugins that you want to be loaded by Falco. Please make sure that plugins have been configured under the "plugins" section before adding them here. |
| falco.log_level | string | `"info"` | Minimum log level to include in logs. Note: these levels are separate from the priority field of rules. This refers only to the log level of falco's internal logging. Can be one of "emergency", "alert", "critical", "error", "warning", "notice", "info", "debug". |
| falco.log_stderr | bool | `true` | Send information logs to stderr. Note these are *not* security notification logs! These are just Falco lifecycle (and possibly error) logs. |
| falco.log_syslog | bool | `true` | Send information logs to syslog. Note these are *not* security notification logs! These are just Falco lifecycle (and possibly error) logs. |
| falco.metadata_download.chunk_wait_us | int | `1000` | Sleep time (in μs) for each download chunck when fetching metadata from Kubernetes. |
| falco.metadata_download.max_mb | int | `100` | Max allowed response size (in Mb) when fetching metadata from Kubernetes. |
| falco.metadata_download.watch_freq_sec | int | `1` | Watch frequency (in seconds) when fetching metadata from Kubernetes. |
| falco.output_timeout | int | `2000` | Duration in milliseconds to wait before considering the output timeout deadline exceed. |
| falco.outputs.max_burst | int | `1000` | Maximum number of tokens outstanding. |
| falco.outputs.rate | int | `1` | Number of tokens gained per second. |
| falco.plugins | list | `[{"init_config":null,"library_path":"libk8saudit.so","name":"k8saudit","open_params":"http://:9765/k8s-audit"},{"library_path":"libcloudtrail.so","name":"cloudtrail"},{"init_config":"","library_path":"libjson.so","name":"json"}]` | Plugins configuration. Add here all plugins and their configuration. Please consult the plugins documentation for more info. Remember to add the plugins name in "load_plugins: []" in order to load them in Falco. |
| falco.priority | string | `"debug"` | Minimum rule priority level to load and run. All rules having a priority more severe than this level will be loaded/run.  Can be one of "emergency", "alert", "critical", "error", "warning", "notice", "informational", "debug". |
| falco.program_output.enabled | bool | `false` | Enable program output for security notifications. |
| falco.program_output.keep_alive | bool | `false` | Start the program once or re-spawn when a notification arrives. |
| falco.program_output.program | string | `"jq '{text: .output}' | curl -d @- -X POST https://hooks.slack.com/services/XXX"` | Command to execute for program output. |
| falco.rules_file | list | `["/etc/falco/falco_rules.yaml","/etc/falco/falco_rules.local.yaml","/etc/falco/rules.d"]` | The location of the rules files that will be consumed by Falco. |
| falco.stdout_output.enabled | bool | `true` | Enable stdout output for security notifications. |
| falco.syscall_buf_size_preset | int | `4` | This is an index that controls the dimension of the syscall buffers. |
| falco.syscall_event_drops.actions | list | `["log","alert"]` | Actions to be taken when system calls were dropped from the circular buffer. |
| falco.syscall_event_drops.max_burst | int | `1` | Max burst of messages emitted. |
| falco.syscall_event_drops.rate | float | `0.03333` | Rate at which log/alert messages are emitted. |
| falco.syscall_event_drops.threshold | float | `0.1` | The messages are emitted when the percentage of dropped system calls with respect the number of events in the last second is greater than the given threshold (a double in the range [0, 1]). |
| falco.syscall_event_timeouts.max_consecutives | int | `1000` | Maximum number of consecutive timeouts without an event after which you want Falco to alert. |
| falco.syslog_output.enabled | bool | `true` | Enable syslog output for security notifications. |
| falco.time_format_iso_8601 | bool | `false` | If true, the times displayed in log messages and output messages will be in ISO 8601. By default, times are displayed in the local time zone, as governed by /etc/localtime. |
| falco.watch_config_files | bool | `true` | Watch config file and rules files for modification. When a file is modified, Falco will propagate new config, by reloading itself. |
| falco.webserver.enabled | bool | `true` | Enable Falco embedded webserver. |
| falco.webserver.k8s_healthz_endpoint | string | `"/healthz"` | Endpoint where Falco exposes the health status. |
| falco.webserver.listen_port | int | `8765` | Port where Falco embedded webserver listen to connections. |
| falco.webserver.ssl_certificate | string | `"/etc/falco/falco.pem"` | Certificate bundle path for the Falco embedded webserver. |
| falco.webserver.ssl_enabled | bool | `false` | Enable SSL on Falco embedded webserver. |
| falcosidekick | object | `{"enabled":false,"fullfqdn":false,"listenPort":""}` | For configuration values, see https://github.com/falcosecurity/charts/blob/master/falcosidekick/values.yaml |
| falcosidekick.enabled | bool | `false` | Enable falcosidekick deployment. |
| falcosidekick.fullfqdn | bool | `false` | Enable usage of full FQDN of falcosidekick service (useful when a Proxy is used). |
| falcosidekick.listenPort | string | `""` | Listen port. Default value: 2801 |
| fullnameOverride | string | `""` | Same as nameOverride but for the fullname. |
| gvisor | object | `{"enabled":false,"runsc":{"config":"/run/containerd/runsc/config.toml","path":"/home/containerd/usr/local/sbin","root":"/run/containerd/runsc"}}` | Gvisor configuration. Based on your system you need to set the appropriate values. Please, rembember to add pod tolerations and affinities in order to schedule the Falco pods in the gVisor enabled nodes. |
| gvisor.enabled | bool | `false` | Set it to true if you want to deploy Falco with gVisor support. |
| gvisor.runsc | object | `{"config":"/run/containerd/runsc/config.toml","path":"/home/containerd/usr/local/sbin","root":"/run/containerd/runsc"}` | Runsc container runtime configuration. Falco needs to interact with it in order to intercept the activity of the sandboxed pods. |
| gvisor.runsc.config | string | `"/run/containerd/runsc/config.toml"` | Absolute path of the `runsc` configuration file, used by Falco to set its configuration and make aware `gVisor` of its presence. |
| gvisor.runsc.path | string | `"/home/containerd/usr/local/sbin"` | Absolute path of the `runsc` binary in the k8s nodes. |
| gvisor.runsc.root | string | `"/run/containerd/runsc"` | Absolute path of the root directory of the `runsc` container runtime. It is of vital importance for Falco since `runsc` stores there the information of the workloads handled by it; |
| healthChecks | object | `{"livenessProbe":{"initialDelaySeconds":60,"periodSeconds":15,"timeoutSeconds":5},"readinessProbe":{"initialDelaySeconds":30,"periodSeconds":15,"timeoutSeconds":5}}` | Parameters used |
| healthChecks.livenessProbe.initialDelaySeconds | int | `60` | Tells the kubelet that it should wait X seconds before performing the first probe. |
| healthChecks.livenessProbe.periodSeconds | int | `15` | Specifies that the kubelet should perform the check every x seconds. |
| healthChecks.livenessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| healthChecks.readinessProbe.initialDelaySeconds | int | `30` | Tells the kubelet that it should wait X seconds before performing the first probe. |
| healthChecks.readinessProbe.periodSeconds | int | `15` | Specifies that the kubelet should perform the check every x seconds. |
| healthChecks.readinessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| image.pullPolicy | string | `"IfNotPresent"` | The image pull policy. |
| image.registry | string | `"docker.io"` | The image registry to pull from. |
| image.repository | string | `"falcosecurity/falco-no-driver"` | The image repository to pull from |
| image.tag | string | `""` | The image tag to pull. Overrides the image tag whose default is the chart appVersion. |
| imagePullSecrets | list | `[]` | Secrets containing credentials when pulling from private/secure registries. |
| mounts.enforceProcMount | bool | `false` | By default, `/proc` from the host is only mounted into the Falco pod when `driver.enabled` is set to `true`. This flag allows it to override this behaviour for edge cases where `/proc` is needed but syscall data source is not enabled at the same time (e.g. for specific plugins). |
| mounts.volumeMounts | list | `[]` | A list of volumes you want to add to the Falco pods. |
| mounts.volumes | list | `[]` | A list of volumes you want to add to the Falco pods. |
| nameOverride | string | `""` | Put here the new name if you want to override the release name used for Falco components. |
| namespaceOverride | string | `""` | Override the deployment namespace |
| nodeSelector | object | `{}` | Selectors used to deploy Falco on a given node/nodes. |
| podAnnotations | object | `{}` | Add additional pod annotations |
| podLabels | object | `{}` | Add additional pod labels |
| podPriorityClassName | string | `nil` | Set pod priorityClassName |
| podSecurityContext | object | `{}` | Set securityContext for the pods These security settings are overriden by the ones specified for the specific containers when there is overlap. |
| rbac.create | bool | `true` |  |
| resources.limits | object | `{"cpu":"1000m","memory":"1024Mi"}` | Maximum amount of resources that Falco container could get. If you are enabling more than one source in falco, than consider to increase the cpu limits. |
| resources.requests | object | `{"cpu":"100m","memory":"512Mi"}` | Although resources needed are subjective on the actual workload we provide a sane defaults ones. If you have more questions or concerns, please refer to #falco slack channel for more info about it. |
| scc.create | bool | `true` | Create OpenShift's Security Context Constraint. |
| serviceAccount.annotations | object | `{}` | Annotations to add to the service account. |
| serviceAccount.create | bool | `true` | Specifies whether a service account should be created. |
| serviceAccount.name | string | `""` | The name of the service account to use. If not set and create is true, a name is generated using the fullname template |
| services | string | `nil` | Network services configuration (scenario requirement) Add here your services to be deployed together with Falco. |
| tolerations | list | `[{"effect":"NoSchedule","key":"node-role.kubernetes.io/master"},{"effect":"NoSchedule","key":"node-role.kubernetes.io/control-plane"}]` | Tolerations to allow Falco to run on Kubernetes masters. |
| tty | bool | `false` | Attach the Falco process to a tty inside the container. Needed to flush Falco logs as soon as they are emitted. Set it to "true" when you need the Falco logs to be immediately displayed. |
