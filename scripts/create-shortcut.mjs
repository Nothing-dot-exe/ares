// scripts/create-shortcut.mjs
// Creates desktop shortcuts for Ares IDE native desktop application

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function createShortcuts() {
  const targetPath = path.join(rootDir, 'run.bat');
  const iconPath = path.join(rootDir, 'resources', 'win32', 'code.ico');
  const workDir = rootDir;

  const psScript = `
    $wshell = New-Object -ComObject WScript.Shell
    $destinations = @(
      [Environment]::GetFolderPath('Desktop'),
      "$env:USERPROFILE\\OneDrive\\Desktop",
      "$env:USERPROFILE\\Desktop",
      "C:\\Users\\kadam\\OneDrive\\Desktop",
      "C:\\Users\\kadam\\Desktop"
    ) | Where-Object { Test-Path $_ } | Select-Object -Unique

    foreach ($dest in $destinations) {
      # 1. Primary Shortcut: Ares IDE.lnk
      $aresPath = Join-Path $dest "Ares IDE.lnk"
      $shortcut = $wshell.CreateShortcut($aresPath)
      $shortcut.TargetPath = '${targetPath}'
      $shortcut.WorkingDirectory = '${workDir}'
      $shortcut.IconLocation = '${iconPath},0'
      $shortcut.Description = 'Ares IDE - Native AI-Powered Desktop IDE'
      $shortcut.Save()
      Write-Output "SUCCESS: Created $aresPath"

      # 2. Secondary Alias: Ares.lnk
      $aresAlias = Join-Path $dest "Ares.lnk"
      $scAlias = $wshell.CreateShortcut($aresAlias)
      $scAlias.TargetPath = '${targetPath}'
      $scAlias.WorkingDirectory = '${workDir}'
      $scAlias.IconLocation = '${iconPath},0'
      $scAlias.Description = 'Ares IDE - Native AI-Powered Desktop IDE'
      $scAlias.Save()
      Write-Output "SUCCESS: Created $aresAlias"

      # 3. Remove legacy Code OSS.lnk if present
      $codePath = Join-Path $dest "Code OSS.lnk"
      if (Test-Path $codePath) {
        Remove-Item -Force $codePath
        Write-Output "REMOVED: Old legacy shortcut $codePath"
      }
    }
  `;

  try {
    const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');
    const result = execSync(`powershell -NoProfile -EncodedCommand ${encodedCommand}`, { encoding: 'utf8' });
    console.log(result.trim());
  } catch (err) {
    console.error('Failed to create shortcut:', err.message);
    process.exit(1);
  }
}

createShortcuts();
