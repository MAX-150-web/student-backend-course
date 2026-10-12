const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createApp } = require('../app');
const { createExampleApp } = require('../example');
const scenarios = require('./scenarios');
const run = promisify(execFile);

async function main() {
  const root = path.join(__dirname, '..');
  const resultsDir = path.join(root, 'checks');
  fs.mkdirSync(resultsDir, { recursive: true });
  const servers = [];
  const output = [`Actual curl responses; UTC ${new Date().toISOString()}`, `Node ${process.version}`];
  const commands = ['# Запуск: node app.js (3000), node example.js (3001).', '# PowerShell: использовать curl.exe; Linux/macOS: curl.', '# Выполнять последовательно после свежего запуска серверов.'];
  const responses = [];
  try {
    for (const [app, port] of [[createApp(), 3000], [createExampleApp(), 3001]]) {
      await new Promise((resolve, reject) => {
        const server = app.listen(port, '127.0.0.1', resolve);
        server.once('error', reject);
        servers.push(server);
      });
      output.push(`Server listening at http://127.0.0.1:${port}`);
    }
    for (const entry of scenarios) {
      const url = `http://127.0.0.1:${entry.port}${entry.path}`;
      const args = ['--silent', '--show-error', '--include', '--max-time', '10', '--request', entry.method, url];
      let bodyFile;
      if (entry.body !== undefined) {
        bodyFile = path.join(resultsDir, `${entry.key}-request.json`);
        fs.writeFileSync(bodyFile, JSON.stringify(entry.body, null, 2) + '\n');
        args.push('--header', 'Content-Type: application/json', '--data-binary', `@${bodyFile}`);
      }
      const bodyArg = bodyFile ? ` --header "Content-Type: application/json" --data-binary "@checks/${entry.key}-request.json"` : '';
      const command = `curl.exe --silent --show-error --include --max-time 10 --request ${entry.method} "${url}"${bodyArg}`;
      commands.push(`\n# ${entry.title}`, command);
      const { stdout, stderr } = await run(process.platform === 'win32' ? 'curl.exe' : 'curl', args, { encoding: 'utf8' });
      const status = Number(stdout.match(/^HTTP\/\S+ (\d+)/)?.[1]);
      assert.equal(status, entry.status, entry.key);
      const bodyText = stdout.split(/\r?\n\r?\n/).slice(1).join('\n\n');
      if (status === 204) assert.equal(bodyText, '', '204 должен иметь пустое тело');
      output.push(`\n=== ${entry.key}: ${entry.title} ===`, `$ ${command}`, stdout, stderr || '', `PASS: HTTP ${status}`);
      responses.push({ key: entry.key, status, raw: stdout });
      console.log(`${entry.key}: HTTP ${status} PASS`);
    }
    output.push(`\nPASS: ${scenarios.length}/${scenarios.length} curl checks`);
  } finally {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    fs.writeFileSync(path.join(resultsDir, 'curl-output.txt'), output.join('\n') + '\n');
    fs.writeFileSync(path.join(resultsDir, 'curl-responses.json'), JSON.stringify(responses, null, 2) + '\n');
    fs.writeFileSync(path.join(root, 'curl_commands.txt'), commands.join('\n') + '\n');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
