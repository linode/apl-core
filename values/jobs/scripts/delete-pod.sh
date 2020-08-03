[[ -z "$LABELS" || -z "$NS" ]] && echo "Error: Missing environment variables" && exit 2

set -e
echo "MAINTENANCE TASK: deleting first found pod with labels ${LABELS} in namespace ${NS}"
echo "MAINTENANCE NOTE: this is needed because the component in question does not function correctly and loses desired state."
echo "MAINTENANCE TODO: find out if and why this is the case and keep filing reports for component with labels ${LABELS} in namespace ${NS}"
pod=$(kubectl -n ${NS} get po -l "${LABELS}" -ojsonpath='{.items[0].metadata.name}')
kubectl -n ${NS} delete po $pod
