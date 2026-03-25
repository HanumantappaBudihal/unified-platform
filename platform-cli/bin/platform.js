#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { onboardCommand } from '../src/commands/onboard.js';
import { statusCommand } from '../src/commands/status.js';
import { resourcesCommand } from '../src/commands/resources.js';
import { envCommand } from '../src/commands/env.js';
import { teamCommand } from '../src/commands/team.js';
import { loginCommand } from '../src/commands/login.js';
import { configCommand } from '../src/commands/config.js';

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
