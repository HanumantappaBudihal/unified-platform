import chalk from 'chalk';
import { api } from '../lib/api.js';

export async function whoamiCommand() {
  try {
    const me = await api('/api/v1/whoami');
    if (me.superadmin) {
      console.log(chalk.bold('\n  superadmin') + chalk.gray('  (acts across all tenants)\n'));
      return;
    }
    if (!me.tenant) {
      console.log(chalk.yellow('\n  No tenant resolved for this token.\n'));
      return;
    }
    console.log(chalk.bold(`\n  ${me.tenant.name}`) + chalk.gray(`  (${me.tenant.slug})`));
    console.log(`  plan: ${chalk.cyan(me.tenant.plan)}   role: ${chalk.cyan(me.role)}\n`);
  } catch (e) {
    console.log(chalk.red(`\n  ${e.message}\n`));
  }
}
