{{- define "kafka.quorumVoters" -}}
{{- $voters := list -}}
{{- range $i := until (int .Values.replicaCount) -}}
{{- $voters = append $voters (printf "%d@%s-kafka-%d.%s-kafka-headless:9093" $i $.Release.Name $i $.Release.Name) -}}
{{- end -}}
{{- join "," $voters -}}
{{- end -}}
