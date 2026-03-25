package authz

import rego.v1

# ─── Infrastructure Portal Access ───

infra_apps := {
	"gateway-portal",
	"kafka-portal",
	"cache-portal",
	"storage-portal",
	"grafana",
	"minio-console",
}

# infra-admin → full access
allow if {
	input.app in infra_apps
	user_app_role(input.user, input.app) == "infra-admin"
}

# infra-viewer → read-only
allow if {
	input.app in infra_apps
	user_app_role(input.user, input.app) == "infra-viewer"
	input.action == "read"
}

# gateway-portal infra-admin → access to all infra apps
allow if {
	input.app in infra_apps
	user_app_role(input.user, "gateway-portal") == "infra-admin"
}
