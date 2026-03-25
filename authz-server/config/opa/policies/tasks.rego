package authz

import rego.v1

# ─── Task Management Authorization ───

# Project admins → full CRUD
allow if {
	input.app == "task-manager"
	user_project_role(input.user, "task-manager", input.project) == "project-admin"
}

# Members → create & read
allow if {
	input.app == "task-manager"
	user_project_role(input.user, "task-manager", input.project) == "member"
	input.action in {"create", "read"}
}

# Members → edit/delete own tasks only
allow if {
	input.app == "task-manager"
	user_project_role(input.user, "task-manager", input.project) == "member"
	input.action in {"update", "delete"}
	input.resource == "task"
	data.task_owners[input.resource_id] == input.user
}

# Viewers → read-only
allow if {
	input.app == "task-manager"
	user_project_role(input.user, "task-manager", input.project) == "viewer"
	input.action == "read"
}
