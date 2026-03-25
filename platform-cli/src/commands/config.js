import chalk from 'chalk';
import { setConfig, getConfig } from '../lib/api.js';

export async function configCommand(opts) {
  if (opts.apiUrl) {
    setConfig('apiUrl', opts.apiUrl);
    console.log(chalk.green(`  API URL set to: ${opts.apiUrl}`));
    return;
  }

  const cfg = getConfig();
  console.log(chalk.bold('\n  Platform CLI Configuration\n'));
  console.log(`  API URL:  ${chalk.cyan(cfg.apiUrl)}`);
  console.log(`  Token:    ${cfg.token}`);
  console.log();
}
