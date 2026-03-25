package authz

import rego.v1

# ─── Platform Policies ───
# Governs access to platform-level operations:
#   app: "platform"
#   resource: "apps" | "teams" | "audit" | "environments"
#   action: "create" | "read" | "update" | "delete" | "onboard" | "promote"

# ─── Platform Admin — full access to all platform operations ───
allow if {
	input.app == "platform"
	user_global_role(input.user, "platform-admin")
}

# ─── Team Admin — can manage apps within their team ───
allow if {
	input.app == "platform"
	input.resource == "apps"
	input.action in {"create", "read", "onboard"}
	role := user_app_role(input.user, "platform")
	role == "team-admin"
}

# ─── App Owner — can manage their own app resources ───
allow if {
	input.app == "platform"
	input.resource == "apps"
	input.action in {"read", "update", "onboard", "promote"}
	some app_key
	data.users[input.user].apps[app_key].role == "app-owner"
}

# ─── App Developer — read-only platform access ───
allow if {
	input.app == "platform"
	input.resource in {"apps", "teams", "environments"}
	input.action == "read"
	some app_key
	data.users[input.user].apps[app_key].role in {"app-owner", "app-developer"}
}

# ─── Team management — team admins and platform admins ───
allow if {
	input.app == "platform"
	input.resource == "teams"
	input.action in {"create", "update"}
	role := user_app_role(input.user, "platform")
	role in {"team-admin", "platform-admin"}
}

# ─── Audit log — platform admins and team admins can read ───
allow if {
	input.app == "platform"
	input.resource == "audit"
	input.action == "read"
	role := user_app_role(input.user, "platform")
	role in {"platform-admin", "team-admin"}
}
