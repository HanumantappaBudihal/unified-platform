import chalk from 'chalk';
import ora from 'ora';
import { api, getAppSlug } from '../lib/api.js';

export async function resourcesCommand(action, type, opts) {
  const slug = getAppSlug(opts);
  const validTypes = ['postgres', 'redis', 'kafka', 'minio'];

  if (!validTypes.includes(type)) {
    console.log(chalk.red(`\n  Invalid resource type: ${type}`));
    console.log(chalk.gray(`  Valid types: ${validTypes.join(', ')}\n`));
    return;
  }

  if (action === 'add') {
    const spinner = ora(`Adding ${type} to ${slug} (${opts.env})...`).start();
    try {
      await api(`/api/v1/apps/${slug}/resources`, {
        method: 'POST',
        body: JSON.stringify({ resourceType: type, environment: opts.env }),
      });
      spinner.succeed(`${type} added to ${slug} (${opts.env})`);
    } catch (e) {
      spinner.fail(e.message);
    }
  } else if (action === 'remove') {
    const spinner = ora(`Removing ${type} from ${slug} (${opts.env})...`).start();
    try {
      await api(`/api/v1/apps/${slug}/resources/${type}?environment=${opts.env}`, {
        method: 'DELETE',
      });
      spinner.succeed(`${type} removed from ${slug} (${opts.env})`);
    } catch (e) {
      spinner.fail(e.message);
    }
  } else {
    console.log(chalk.red(`\n  Unknown action: ${action}. Use 'add' or 'remove'.\n`));
  }
}
