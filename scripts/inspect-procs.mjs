import { execSync } from 'child_process';

try {
  const script = `Get-CimInstance Win32_Process | Where-Object { $_.Name -like '*node*' -or $_.Name -like '*electron*' -or $_.Name -like '*Ares*' -or $_.Name -like '*Code*' } | Select-Object ProcessId, Name, CommandLine | Format-List`;
  const out = execSync(`powershell -NoProfile -Command "${script}"`, { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.error(e.message);
}
