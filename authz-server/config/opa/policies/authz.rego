package authz

import rego.v1

# ─── InfraMatrix operator authorization (base) ───
#
# This OPA instance governs OPERATOR / infra-op authorization only — who may
# view and operate the shared backing services and operator portals. It does
# NOT decide app/user/tenant permissions; that is owned by the Seiton Platform
# control plane and its own OPA.
#
# Input schema (operator domain):
#   input.user   : operator id (JWT "sub" / username)
#   input.action : "read" | "list" | "metrics"                       (read)
#                | "scale" | "restart" | "reload" | "provision"      (operate)
#                | "decommission" | "configure" | "rotate"
#   input.target : infra component — "kafka" | "redis" | "minio"
#                | "postgres" | "gateway" | "monitoring" | "logging" | "backup"
#   input.portal : (optional) operator portal id for UI access
#
# Role data (pushed to OPA at data.users[user]):
#   global_roles : ["infra-super-admin"]
#   infra.role   : "infra-admin" | "infra-operator" | "infra-viewer"

# Default deny — every request must be explicitly allowed.
default allow := false

# ─── Operator super-admin — unrestricted infra control ───
allow if {
	user_global_role(input.user, "infra-super-admin")
}

# ─── Helpers ───

# True when the user carries the given global operator role.
user_global_role(user, role) if {
	data.users[user].global_roles[_] == role
}

# The user's infra role ("infra-admin" | "infra-operator" | "infra-viewer"), if any.
user_infra_role(user) := role if {
	role := data.users[user].infra.role
}
