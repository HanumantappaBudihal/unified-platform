import chalk from 'chalk';
import Table from 'cli-table3';
import { api } from '../lib/api.js';

// Resolve which tenant to act on: --tenant wins; otherwise the token's own tenant.
async function currentTenantSlug(opts) {
  if (opts.tenant) return opts.tenant;
  const me = await api('/api/v1/whoami');
  if (me.superadmin) throw new Error('superadmin must pass --tenant <slug>');
  if (!me.tenant) throw new Error('no tenant for this token');
  return me.tenant.slug;
}

export async function tenantCommand(action, arg, opts) {
  try {
    switch (action) {
      case 'list': {
        const { tenants } = await api('/api/v1/tenants');
        const table = new Table({ head: ['Slug', 'Name', 'Plan', 'Status'].map(h => chalk.gray(h)), style: { head: [], border: [] } });
        for (const t of tenants) table.push([t.slug, t.name, t.plan, t.status]);
        console.log('\n' + table.toString() + '\n');
        break;
      }
      case 'create': {
        if (!arg) throw new Error('usage: tenant create <name> [--plan <p>] [--owner <userId>]');
        const res = await api('/api/v1/tenants', {
          method: 'POST',
          body: JSON.stringify({ name: arg, plan: opts.plan, ownerId: opts.owner }),
        });
        console.log(chalk.green(`\n  Tenant created: ${res.tenant.slug} (${res.tenant.plan})`));
        console.log(chalk.bold('  Bootstrap owner token (shown once — store it now):'));
        console.log('  ' + chalk.cyan(res.token) + '\n');
        break;
      }
      case 'token-create': {
        const slug = await currentTenantSlug(opts);
        const res = await api(`/api/v1/tenants/${slug}/tokens`, {
          method: 'POST',
          body: JSON.stringify({ role: opts.role, label: opts.label }),
        });
        console.log(chalk.green(`\n  Token created for ${slug} (${res.meta.role})${res.meta.label ? ' — ' + res.meta.label : ''}:`));
        console.log('  ' + chalk.cyan(res.token) + chalk.gray('   (shown once)\n'));
        break;
      }
      case 'token-list': {
        const slug = await currentTenantSlug(opts);
        const { tokens } = await api(`/api/v1/tenants/${slug}/tokens`);
        const table = new Table({ head: ['ID', 'Prefix', 'Role', 'Label', 'Revoked'].map(h => chalk.gray(h)), style: { head: [], border: [] } });
        for (const t of tokens) table.push([t.id, t.prefix, t.role, t.label || '-', t.revoked ? 'yes' : '']);
        console.log('\n' + table.toString() + '\n');
        break;
      }
      case 'token-revoke': {
        if (!arg) throw new Error('usage: tenant token-revoke <id>');
        const slug = await currentTenantSlug(opts);
        await api(`/api/v1/tenants/${slug}/tokens/${arg}`, { method: 'DELETE' });
        console.log(chalk.green(`\n  Token ${arg} revoked.\n`));
        break;
      }
      case 'member-add': {
        if (!arg) throw new Error('usage: tenant member-add <userId> [--role <r>]');
        const slug = await currentTenantSlug(opts);
        const res = await api(`/api/v1/tenants/${slug}/members`, {
          method: 'POST',
          body: JSON.stringify({ userId: arg, role: opts.role }),
        });
        console.log(chalk.green(`\n  ${res.member.user_id} added as ${res.member.role} to ${slug}.\n`));
        break;
      }
      default:
        console.log(chalk.red(`\n  Unknown action: ${action}`));
        console.log(chalk.gray('  actions: list, create, token-create, token-list, token-revoke, member-add\n'));
    }
  } catch (e) {
    console.log(chalk.red(`\n  ${e.message}\n`));
  }
}
