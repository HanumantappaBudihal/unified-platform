import inquirer from 'inquirer';
import chalk from 'chalk';
import { setConfig, getApiUrl } from '../lib/api.js';

export async function loginCommand() {
  const { apiUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiUrl',
      message: 'Platform API URL:',
      default: getApiUrl(),
    },
  ]);

  setConfig('apiUrl', apiUrl);

  // Try API key auth first (service accounts)
  const { authMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'authMethod',
      message: 'Authentication method:',
      choices: [
        { name: 'API Token (paste a token)', value: 'token' },
        { name: 'Keycloak SSO (browser)', value: 'sso' },
      ],
    },
  ]);

  if (authMethod === 'token') {
    const { token } = await inquirer.prompt([
      { type: 'password', name: 'token', message: 'API Token:', mask: '*' },
    ]);
    setConfig('token', token);
    console.log(chalk.green('\n  Authenticated with API token.'));
  } else {
    // For SSO, open browser to Keycloak device flow
    console.log(chalk.yellow('\n  SSO login: open this URL in your browser:'));
    console.log(chalk.cyan(`  ${apiUrl}/auth/device\n`));
    const { code } = await inquirer.prompt([
      { type: 'input', name: 'code', message: 'Paste the auth code:' },
    ]);
    setConfig('token', code);
    console.log(chalk.green('\n  Authenticated via SSO.'));
  }

  console.log(chalk.gray(`  API: ${apiUrl}\n`));
}
