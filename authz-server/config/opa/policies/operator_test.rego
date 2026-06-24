package authz_test

import rego.v1

import data.authz

# Role fixtures pushed the same way the portal pushes data.users at runtime.
users := {
	"super": {"global_roles": ["infra-super-admin"]},
	"admin": {"infra": {"role": "infra-admin"}},
	"oper": {"infra": {"role": "infra-operator"}},
	"viewer": {"infra": {"role": "infra-viewer"}},
	"nobody": {},
}

test_super_admin_can_do_anything if {
	authz.allow with input as {"user": "super", "action": "decommission", "target": "postgres"}
		with data.users as users
}

test_infra_admin_can_operate_targets if {
	authz.allow with input as {"user": "admin", "action": "scale", "target": "kafka"}
		with data.users as users
}

test_infra_operator_can_operate_targets if {
	authz.allow with input as {"user": "oper", "action": "restart", "target": "redis"}
		with data.users as users
}

test_infra_viewer_cannot_operate if {
	not authz.allow with input as {"user": "viewer", "action": "restart", "target": "kafka"}
		with data.users as users
}

test_infra_viewer_can_read if {
	authz.allow with input as {"user": "viewer", "action": "read", "target": "kafka"}
		with data.users as users
}

test_any_role_can_open_portal if {
	authz.allow with input as {"user": "viewer", "action": "read", "portal": "grafana"}
		with data.users as users
}

test_unknown_user_denied if {
	not authz.allow with input as {"user": "nobody", "action": "read", "target": "kafka"}
		with data.users as users
}

test_unknown_target_denied if {
	not authz.allow with input as {"user": "oper", "action": "read", "target": "unknown"}
		with data.users as users
}

test_default_deny_when_no_match if {
	not authz.allow with input as {"user": "admin", "action": "read", "target": "unknown"}
		with data.users as users
}
