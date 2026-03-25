const registry = require('../db/registry');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function routes(fastify) {
  fastify.get('/api/v1/teams', async () => {
    const teams = await registry.listTeams();
    return { teams };
  });

  fastify.get('/api/v1/teams/:slug', async (req, reply) => {
    const team = await registry.getTeam(req.params.slug);
    if (!team) return reply.code(404).send({ error: 'Team not found' });

    const members = await registry.getTeamMembers(team.id);
    const apps = await registry.listApps({ teamId: team.id });
    return { team, members, apps };
  });

  fastify.post('/api/v1/teams', async (req, reply) => {
    const { name, description } = req.body;
    if (!name) return reply.code(400).send({ error: 'name is required' });

    const slug = slugify(name);
    const existing = await registry.getTeam(slug);
    if (existing) return reply.code(409).send({ error: `Team "${slug}" already exists` });

    const team = await registry.createTeam({ name, slug, description });

    await registry.log({
      actor: 'system',
      action: 'team.created',
      resourceType: 'team',
      resourceId: slug,
      details: { name },
    });

    return reply.code(201).send({ team });
  });

  fastify.post('/api/v1/teams/:slug/members', async (req, reply) => {
    const team = await registry.getTeam(req.params.slug);
    if (!team) return reply.code(404).send({ error: 'Team not found' });

    const { userId, role } = req.body;
    if (!userId) return reply.code(400).send({ error: 'userId is required' });

    const member = await registry.addTeamMember({ teamId: team.id, userId, role });
    return reply.code(201).send({ member });
  });
}

module.exports = routes;
