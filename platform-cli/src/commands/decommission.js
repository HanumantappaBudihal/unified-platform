import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { api, getAppSlug } from '../lib/api.js';

export async function decommissionCommand(opts) {
  const slug = getAppSlug(opts);

  if (!opts.yes) {
    console.log(
      chalk.yellow(
        `\n  This destroys ALL ${opts.env} resources for "${slug}" — ` +
        `databases, topics, and buckets are permanently deleted.\n`
      )
    );
    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: `Decommission ${slug} (${opts.env})?`, default: false },
    ]);
    if (!confirm) {
      console.log(chalk.gray('\n  Aborted.\n'));
      return;
    }
  }

  const spinner = ora(`Decommissioning ${slug} (${opts.env})...`).start();
  try {
    const result = await api(`/api/v1/apps/${slug}?environment=${opts.env}`, { method: 'DELETE' });

    if (result.errors?.length > 0) {
      spinner.warn('Decommissioned with errors');
      for (const err of result.errors) {
        console.log(`  ${chalk.red('✗')} ${err.service}: ${err.error}`);
      }
    } else {
      spinner.succeed(`${slug} decommissioned in ${opts.env}`);
    }
  } catch (e) {
    spinner.fail(e.message);
  }
}
