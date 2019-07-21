Sitespeed is a web page performance test automation tool. Currently, it is running in PROD environment as a CronJob that is executed every one hour. Then, the results are shipped to Graphite which eventually sends them to Grafana to be shown in the custom dashboard (Page Summary).

In TST,ACC the team did not need Sitespeed as a Cronjob but preferred to run Sitespeed in their pipeline.

The results are stored in Persistent Volumes in AWS.