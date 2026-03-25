import chalk from 'chalk';
import ora from 'ora';
import { api, getAppSlug } from '../lib/api.js';

export async function onboardCommand(opts) {
  const slug = getAppSlug(opts);
  const resources = opts.resources.split(',').map(s => s.trim());

  console.log(chalk.bold(`\n  Onboarding: ${slug} → ${opts.env}\n`));
  console.log(`  Resources: ${resources.map(r => chalk.cyan(r)).join(', ')}\n`);

  const spinner = ora('Provisioning resources...').start();

  try {
    const result = await api(`/api/v1/apps/${slug}/onboard`, {
      method: 'POST',
      body: JSON.stringify({ resources, environment: opts.env }),
    });

    if (result.errors?.length > 0) {
      spinner.warn('Partially provisioned');
      for (const err of result.errors) {
        console.log(`  ${chalk.red('✗')} ${err.service}: ${err.error}`);
      }
    } else {
      spinner.succeed('All resources provisioned');
    }

    // Print connection info
    console.log(chalk.bold('\n  Connection Details:\n'));
    for (const [service, data] of Object.entries(result.results || {})) {
      console.log(`  ${chalk.cyan(service)}`);
      if (data.credentials) {
        for (const [k, v] of Object.entries(data.credentials)) {
          console.log(`    ${chalk.gray(k)}: ${v}`);
        }
      }
      if (data.connectionString) {
        console.log(`    ${chalk.gray('url')}: ${data.connectionString}`);
      }
      console.log();
    }
  } catch (e) {
    spinner.fail(e.message);
  }
}
