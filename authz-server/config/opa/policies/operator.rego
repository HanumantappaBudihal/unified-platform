package authz

import rego.v1

# ─── Operator / infra-op authorization ───
# Decides who may read and operate the shared backing services and who may open
# the operator portals. Pairs with the helpers + super-admin rule in authz.rego.

# Infra components this server governs.
infra_targets := {"kafka", "redis", "minio", "postgres", "gateway", "monitoring", "logging", "backup"}

# Operator portals (UI surfaces).
infra_portals := {
	"gateway-portal",
	"kafka-portal",
	"cache-portal",
	"storage-portal",
	"authz-portal",
	"grafana",
	"minio-console",
}

# Read-only operations.
read_actions := {"read", "list", "metrics"}

# Day-2 operational mutations.
operate_actions := {"scale", "restart", "reload", "provision", "decommission", "configure", "rotate"}

# All operator actions (read + operate).
all_actions := read_actions | operate_actions

# ─── infra-admin → full control over any infra target ───
allow if {
	user_infra_role(input.user) == "infra-admin"
	input.target in infra_targets
	input.action in all_actions
}

# ─── infra-operator → read + operate on infra targets ───
allow if {
	user_infra_role(input.user) == "infra-operator"
	input.target in infra_targets
	input.action in all_actions
}

# ─── infra-viewer → read-only on infra targets ───
allow if {
	user_infra_role(input.user) == "infra-viewer"
	input.target in infra_targets
	input.action in read_actions
}

# ─── Operator portal (UI) access — any infra role may open the portals (read) ───
allow if {
	input.portal in infra_portals
	user_infra_role(input.user) in {"infra-admin", "infra-operator", "infra-viewer"}
	input.action in read_actions
}
