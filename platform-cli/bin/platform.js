#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { onboardCommand } from '../src/commands/onboard.js';
import { decommissionCommand } from '../src/commands/decommission.js';
import { statusCommand } from '../src/commands/status.js';
import { resourcesCommand } from '../src/commands/resources.js';
import { envCommand } from '../src/commands/env.js';
import { teamCommand } from '../src/commands/team.js';
import { loginCommand } from '../src/commands/login.js';
import { configCommand } from '../src/commands/config.js';
import { whoamiCommand } from '../src/commands/whoami.js';
import { tenantCommand } from '../src/commands/tenant.js';

program
  .name('platform')
  .description('Internal Developer Platform CLI')
  .version('1.0.0');

program
  .command('login')
  .description('Authenticate with the platform')
  .action(loginCommand);

program
  .command('config')
  .description('View or set CLI configuration')
  .option('--api-url <url>', 'Set platform API URL')
  .option('--show', 'Show current config')
  .action(configCommand);

program
  .command('whoami')
  .description('Show the tenant and role for the current token')
  .action(whoamiCommand);

program
  .command('tenant')
  .description('Manage tenants, members, and API tokens')
  .argument('<action>', 'list | create | token-create | token-list | token-revoke | member-add | usage | billing')
  .argument('[arg]', 'name / token-id / userId, depending on the action')
  .option('--plan <plan>', 'Plan for tenant create')
  .option('--owner <userId>', 'Owner user id for tenant create')
  .option('--role <role>', 'Role (viewer|developer|admin|owner)')
  .option('--label <label>', 'Label for a new token')
  .option('--tenant <slug>', 'Target tenant (superadmin)')
  .action(tenantCommand);

program
  .command('init <name>')
  .description('Register a new app and optionally scaffold from a template')
  .option('-t, --template <template>', 'Scaffold from template (node-api, next-app, spring-boot, python-fastapi)')
  .option('-d, --description <desc>', 'App description')
  .option('--team <team>', 'Team slug')
  .action(initCommand);

program
  .command('onboard')
  .description('Provision all resources for the current app')
  .option('-a, --app <slug>', 'App slug (defaults to current directory name)')
  .option('-e, --env <environment>', 'Target environment', 'dev')
  .option('-r, --resources <list>', 'Comma-separated resource types', 'postgres,redis,kafka,minio')
  .action(onboardCommand);

program
  .command('status')
  .description('Show app resources, health, and credentials')
  .option('-a, --app <slug>', 'App slug')
  .option('--credentials', 'Show credentials')
  .action(statusCommand);

program
  .command('decommission')
  .description('Tear down all resources for an app in an environment')
  .option('-a, --app <slug>', 'App slug (defaults to current directory name)')
  .option('-e, --env <environment>', 'Target environment', 'dev')
  .option('-y, --yes', 'Skip the confirmation prompt')
  .action(decommissionCommand);

program
  .command('resources')
  .description('Manage app resources')
  .argument('<action>', 'add or remove')
  .argument('<type>', 'Resource type (postgres, redis, kafka, minio)')
  .option('-a, --app <slug>', 'App slug')
  .option('-e, --env <environment>', 'Environment', 'dev')
  .action(resourcesCommand);

program
  .command('env')
  .description('Manage environments')
  .argument('<action>', 'list or promote')
  .argument('[target]', 'Target environment for promote')
  .option('-a, --app <slug>', 'App slug')
  .option('--from <env>', 'Source environment', 'dev')
  .action(envCommand);

program
  .command('team')
  .description('Manage teams')
  .argument('<action>', 'list, create, or add-member')
  .argument('[args...]', 'Arguments for the action')
  .action(teamCommand);

program.parse();
