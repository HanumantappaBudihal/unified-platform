import chalk from 'chalk';
import Table from 'cli-table3';
import { api, getAppSlug } from '../lib/api.js';

export async function statusCommand(opts) {
  const slug = getAppSlug(opts);

  try {
    const { app, resources } = await api(`/api/v1/apps/${slug}`);

    if (!app) {
      console.log(chalk.red(`\n  App not found: ${slug}\n`));
      return;
    }

    const statusIcon = app.status === 'active' ? chalk.green('●') : app.status === 'partial' ? chalk.yellow('●') : chalk.gray('●');

    console.log(chalk.bold(`\n  ${app.name}`) + ` ${statusIcon} ${app.status}`);
    console.log(chalk.gray(`  ${app.slug} — ${app.description || 'No description'}`));
    console.log(chalk.gray(`  Owner: ${app.owner_id} | Created: ${new Date(app.created_at).toLocaleDateString()}\n`));

    if (resources.length === 0) {
      console.log(chalk.gray('  No resources provisioned. Run: platform onboard\n'));
      return;
    }

    const table = new Table({
      head: ['Resource', 'Environment', 'Status', 'Provisioned'].map(h => chalk.gray(h)),
      style: { head: [], border: [] },
    });

    for (const r of resources) {
      const statusColor = r.status === 'provisioned' ? chalk.green : chalk.yellow;
      table.push([
        r.resource_type,
        r.environment,
        statusColor(r.status),
        r.provisioned_at ? new Date(r.provisioned_at).toLocaleDateString() : '-',
      ]);
    }

    console.log(table.toString());

    if (opts.credentials) {
      console.log(chalk.bold('\n  Credentials:\n'));
      for (const r of resources) {
        if (r.credentials && Object.keys(r.credentials).length > 0) {
          console.log(`  ${chalk.cyan(r.resource_type)} (${r.environment})`);
          for (const [k, v] of Object.entries(r.credentials)) {
            console.log(`    ${chalk.gray(k)}: ${v}`);
          }
          console.log();
        }
      }
    }
  } catch (e) {
    console.log(chalk.red(`\n  Error: ${e.message}\n`));
  }
}
