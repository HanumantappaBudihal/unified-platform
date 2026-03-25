import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { api, getAppSlug } from '../lib/api.js';

export async function envCommand(action, target, opts) {
  const slug = getAppSlug(opts);

  if (action === 'list') {
    try {
      const data = await api(`/api/v1/apps/${slug}/environments`);

      console.log(chalk.bold(`\n  Environments for ${data.app.name}\n`));

      const table = new Table({
        head: ['Environment', 'Status', 'Resources'].map(h => chalk.gray(h)),
        style: { head: [], border: [] },
      });

      for (const env of data.environments) {
        const statusIcon = env.provisioned ? chalk.green('● active') : chalk.gray('○ empty');
        const resList = env.resources.map(r => r.type).join(', ') || '-';
        table.push([env.slug, statusIcon, resList]);
      }

      console.log(table.toString());
      console.log();
    } catch (e) {
      console.log(chalk.red(`\n  Error: ${e.message}\n`));
    }
  } else if (action === 'promote') {
    if (!target) {
      console.log(chalk.red('\n  Target environment required. Usage: platform env promote staging\n'));
      return;
    }

    const spinner = ora(`Promoting ${slug}: ${opts.from} → ${target}...`).start();
    try {
      const result = await api(`/api/v1/apps/${slug}/promote/${target}`, {
        method: 'POST',
        body: JSON.stringify({ sourceEnvironment: opts.from }),
      });

      if (result.errors?.length > 0) {
        spinner.warn('Partially promoted');
        for (const err of result.errors) {
          console.log(`  ${chalk.red('✗')} ${err.service}: ${err.error}`);
        }
      } else {
        spinner.succeed(`Promoted to ${target} (${Object.keys(result.results || {}).length} resources)`);
      }
      console.log();
    } catch (e) {
      spinner.fail(e.message);
    }
  } else {
    console.log(chalk.red(`\n  Unknown action: ${action}. Use 'list' or 'promote'.\n`));
  }
}
