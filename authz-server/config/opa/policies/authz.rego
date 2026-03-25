package authz

import rego.v1

# Default deny — every request must be explicitly allowed
default allow := false

# ─── Input Schema ───
# input.user        : user ID (from JWT "sub" or username)
# input.app         : application ID (e.g., "task-manager", "gateway-portal")
# input.action      : action being performed (e.g., "read", "create", "update", "delete")
# input.resource    : resource type (e.g., "task", "project", "portal")
# input.resource_id : specific resource ID (optional)
# input.project     : project/scope context (optional)

# ─── Super Admin ───
allow if {
	user_global_role(input.user, "super-admin")
}

# ─── App-Level Admin ───
allow if {
	app_role := user_app_role(input.user, input.app)
	app_role == "admin"
}

# ─── Helper: Check global role ───
user_global_role(user, role) if {
	data.users[user].global_roles[_] == role
}

# ─── Helper: Get app role ───
user_app_role(user, app) := role if {
	role := data.users[user].apps[app].role
}

# ─── Helper: Get project role ───
user_project_role(user, app, project) := role if {
	role := data.users[user].apps[app].projects[project]
}
