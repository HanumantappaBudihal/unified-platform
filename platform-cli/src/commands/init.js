import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { existsSync, mkdirSync, writeFileSync, cpSync } from 'fs';
import { join, resolve } from 'path';

const TEMPLATES_DIR = resolve(new URL('../../..', import.meta.url).pathname.slice(1), 'templates');

export async function initCommand(name, opts) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Register app
  const spinner = ora('Registering app on platform...').start();
  try {
    const { app } = await api('/api/v1/apps', {
      method: 'POST',
      body: JSON.stringify({
        name,
        ownerId: 'cli-user',
        description: opts.description || '',
        teamId: opts.team || undefined,
      }),
    });

    spinner.succeed(`App registered: ${chalk.bold(app.slug)}`);
  } catch (e) {
    if (e.message.includes('already exists')) {
      spinner.warn(`App "${slug}" already registered, continuing with scaffold...`);
    } else {
      spinner.fail(e.message);
      return;
    }
  }

  // Scaffold from template if requested
  if (opts.template) {
    const templateDir = join(TEMPLATES_DIR, opts.template);
    const targetDir = join(process.cwd(), slug);

    if (!existsSync(templateDir)) {
      console.log(chalk.red(`\n  Template not found: ${opts.template}`));
      console.log(chalk.gray('  Available: node-api, next-app\n'));
      return;
    }

    const scaffoldSpinner = ora(`Scaffolding from template: ${opts.template}...`).start();
    try {
      mkdirSync(targetDir, { recursive: true });
      cpSync(templateDir, targetDir, { recursive: true });

      // Replace placeholders in package.json
      const pkgPath = join(targetDir, 'package.json');
      if (existsSync(pkgPath)) {
        let pkg = require('fs').readFileSync(pkgPath, 'utf-8');
        pkg = pkg.replace(/\{\{APP_NAME\}\}/g, slug);
        writeFileSync(pkgPath, pkg);
      }

      // Write .platform.json config
      writeFileSync(join(targetDir, '.platform.json'), JSON.stringify({
        app: slug,
        template: opts.template,
        createdAt: new Date().toISOString(),
      }, null, 2));

      scaffoldSpinner.succeed(`Scaffolded in ${chalk.cyan(`./${slug}/`)}`);
    } catch (e) {
      scaffoldSpinner.fail(`Scaffold error: ${e.message}`);
    }
  }

  console.log(`\n  ${chalk.bold('Next steps:')}`);
  if (opts.template) console.log(`  ${chalk.gray('$')} cd ${slug}`);
  console.log(`  ${chalk.gray('$')} platform onboard -a ${slug}`);
  console.log(`  ${chalk.gray('$')} platform status -a ${slug}\n`);
}
