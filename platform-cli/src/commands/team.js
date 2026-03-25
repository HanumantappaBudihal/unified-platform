import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { api } from '../lib/api.js';

export async function teamCommand(action, args) {
  if (action === 'list') {
    try {
      const { teams } = await api('/api/v1/teams');
      if (teams.length === 0) {
        console.log(chalk.gray('\n  No teams found. Create one: platform team create <name>\n'));
        return;
      }

      const table = new Table({
        head: ['Name', 'Slug', 'Members'].map(h => chalk.gray(h)),
        style: { head: [], border: [] },
      });

      for (const t of teams) {
        table.push([t.name, t.slug, t.member_count || '-']);
      }

      console.log(chalk.bold('\n  Teams\n'));
      console.log(table.toString());
      console.log();
    } catch (e) {
      console.log(chalk.red(`\n  Error: ${e.message}\n`));
    }
  } else if (action === 'create') {
    const name = args[0];
    if (!name) {
      console.log(chalk.red('\n  Team name required. Usage: platform team create <name>\n'));
      return;
    }

    const spinner = ora(`Creating team: ${name}...`).start();
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await api('/api/v1/teams', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      });
      spinner.succeed(`Team created: ${slug}`);
    } catch (e) {
      spinner.fail(e.message);
    }
  } else if (action === 'add-member') {
    const [teamSlug, userId, role] = args;
    if (!teamSlug || !userId) {
      console.log(chalk.red('\n  Usage: platform team add-member <team-slug> <user-id> [role]\n'));
      return;
    }

    const spinner = ora(`Adding ${userId} to ${teamSlug}...`).start();
    try {
      await api(`/api/v1/teams/${teamSlug}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, role: role || 'developer' }),
      });
      spinner.succeed(`Added ${userId} to ${teamSlug} as ${role || 'developer'}`);
    } catch (e) {
      spinner.fail(e.message);
    }
  } else {
    console.log(chalk.red(`\n  Unknown action: ${action}. Use 'list', 'create', or 'add-member'.\n`));
  }
}
