// scripts/kill-servers.mjs
// Terminates any existing Ares IDE, Code OSS, VS Code Server, and background dev processes

import { execSync } from 'child_process';

export function killAllServers() {
  const currentPid = `${process.pid}`;
  const killedPids = new Set();
  const targetPorts = [8080, 9888, 3000, 5000, 8081, 5870];

  console.log('[*] Terminating all old Ares IDE and server processes...');

  // 1. Kill Ares.exe and Code - OSS.exe
  try {
    execSync('taskkill /F /IM "Ares.exe"', { stdio: 'ignore' });
    console.log('[*] Terminated Ares.exe processes.');
  } catch {}

  try {
    execSync('taskkill /F /IM "Code - OSS.exe"', { stdio: 'ignore' });
    console.log('[*] Terminated Code - OSS.exe processes.');
  } catch {}

  // 2. Free target listening ports
  try {
    const netstatOut = execSync('netstat -ano', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = netstatOut.split('\n');
    for (const line of lines) {
      if (!line.includes('LISTENING')) continue;
      for (const port of targetPorts) {
        if (line.includes(`:${port}`)) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== currentPid && !killedPids.has(pid)) {
            killedPids.add(pid);
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              console.log(`[*] Freed port ${port} by terminating PID ${pid}`);
            } catch {}
          }
        }
      }
    }
  } catch (e) {
    console.warn('[!] Port scan notice:', e.message);
  }

  // 3. Terminate any orphaned node processes running code-server, code-web, serve-web, or watchers
  try {
    const psCmd = `Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -or $_.Name -like '*electron*') -and ($_.CommandLine -like '*code-server*' -or $_.CommandLine -like '*code-web*' -or $_.CommandLine -like '*serve-web*' -or $_.CommandLine -like '*watch-client*') } | Select-Object -ExpandProperty ProcessId`;
    const out = execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const pids = out.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const pid of pids) {
      if (pid && pid !== currentPid && !killedPids.has(pid)) {
        killedPids.add(pid);
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[*] Terminated orphaned dev/server process PID ${pid}`);
        } catch {}
      }
    }
  } catch (e) {
    // Non-fatal if PowerShell command fails or returns empty
  }

  if (killedPids.size === 0) {
    console.log('[*] All server ports and processes are clean.');
  } else {
    console.log(`[*] Successfully killed ${killedPids.size} server/process instances.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('kill-servers.mjs')) {
  killAllServers();
}
