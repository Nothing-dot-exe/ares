// scripts/prepare-desktop.mjs
// Prepares a clean single-window environment for Ares IDE Native Desktop Application

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { killAllServers } from './kill-servers.mjs';

async function prepareDesktop() {
  // 1 & 2. Kill all servers, old Ares IDE/Code-OSS processes, and free ports
  killAllServers();

  // 3. Clear stale window restore states to prevent 3 apps opening at once
  const appData = process.env.APPDATA;
  if (appData) {
    const codeOssUserDir = path.join(appData, 'code-oss-dev', 'User');
    const workspaceStorageDir = path.join(codeOssUserDir, 'workspaceStorage');
    const backupsDir = path.join(appData, 'code-oss-dev', 'Backups');

    try {
      if (fs.existsSync(workspaceStorageDir)) {
        fs.rmSync(workspaceStorageDir, { recursive: true, force: true });
        console.log('[*] Cleared stale multi-window workspace cache.');
      }
    } catch {}

    try {
      if (fs.existsSync(backupsDir)) {
        fs.rmSync(backupsDir, { recursive: true, force: true });
        console.log('[*] Cleared stale session backups.');
      }
    } catch {}

    // Ensure settings.json sets window.restoreWindows to 'none'
    try {
      fs.mkdirSync(codeOssUserDir, { recursive: true });
      const settingsPath = path.join(codeOssUserDir, 'settings.json');
      let settings = {};
      if (fs.existsSync(settingsPath)) {
        try {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch {}
      }
      settings['window.restoreWindows'] = 'none';
      settings['window.openWithoutArgumentsInNewWindow'] = 'off';
      settings['workbench.externalBrowser'] = 'none';
      settings['aresAi.provider'] = 'Groq';
      settings['aresAi.model'] = 'openai/gpt-oss-120b';
      settings['universalAi.provider'] = 'Groq';
      settings['universalAi.model'] = 'openai/gpt-oss-120b';
      settings['chat.defaultModel'] = 'universal-ai/openai/gpt-oss-120b';
      settings['chat.viewSessions.enabled'] = false;
      settings['security.workspace.trust.enabled'] = false;
      settings['editor.inlineSuggest.enabled'] = true;
      settings['github.copilot.enable'] = { '*': true };

      settings['chat.implicitContext.enabled'] = { 'panel': 'always' };
      settings['chat.checkpoints.enabled'] = true;
      settings['chat.artifacts.enabled'] = true;
      settings['chat.autopilot.advanced.enabled'] = true;
      settings['chat.tools.global.autoApprove'] = true;
      settings['chat.tools.terminal.enableAutoApprove'] = true;
      settings['chat.tools.terminal.autoApprove'] = { '.*': true };
      settings['chat.agent.sandbox.allowUnsandboxedCommands'] = true;
      settings['inlineChat.affordance'] = 'editor';
      settings['chat.unifiedAgentsBar.enabled'] = true;
      settings['chat.editing.alwaysShowEdits'] = true;
      settings['chat.agent.maxRequests'] = 100;
      settings['chat.detectExternalEdits'] = true;
      settings['chat.languageModels.overrideEnabled'] = true;

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      console.log('[*] Configured single-window launch mode (all hidden Ares AI features & bypasses unlocked).');
    } catch (e) {
      console.warn('[!] Could not write settings.json:', e.message);
    }
  }

  // 4. Sanitize SQLite databases (remove universal-ai from disabled list, ensure chat setup completed)
  if (appData) {
    const codeOssBase = path.join(appData, 'code-oss-dev');
    try {
      const { DatabaseSync } = await import('node:sqlite');
      function findDbs(dir) {
        let res = [];
        if (!fs.existsSync(dir)) return res;
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) res.push(...findDbs(full));
          else if (ent.name === 'state.vscdb') res.push(full);
        }
        return res;
      }

      const dbs = findDbs(codeOssBase);
      for (const dbPath of dbs) {
        try {
          const db = new DatabaseSync(dbPath);
          // Clean extensionsIdentifiers/disabled
          const disabledRow = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get('extensionsIdentifiers/disabled');
          if (disabledRow && disabledRow.value) {
            try {
              const list = JSON.parse(disabledRow.value);
              if (Array.isArray(list)) {
                const cleaned = list.filter(e => {
                  const id = (e.id || '').toLowerCase();
                  return id !== 'vscode.universal-ai' && id !== 'custom.universal-ai' && id !== 'universal-ai';
                });
                if (cleaned.length !== list.length) {
                  db.prepare('UPDATE ItemTable SET value = ? WHERE key = ?').run(JSON.stringify(cleaned), 'extensionsIdentifiers/disabled');
                  console.log(`[*] Sanitized extensionsIdentifiers/disabled in ${path.basename(path.dirname(dbPath))}/state.vscdb`);
                }
              }
            } catch {}
          }

          // Always ensure chat setup context is correct (entitlement=6 Enterprise, installed=true)
          const enabledContext = JSON.stringify({
            entitlement: 6,
            installed: true,
            disabled: false,
            untrusted: false,
            disabledInWorkspace: false,
            hidden: false,
            completed: true,
            registered: true
          });
          const setupRow = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get('chat.setupContext');
          if (setupRow) {
            db.prepare('UPDATE ItemTable SET value = ? WHERE key = ?').run(enabledContext, 'chat.setupContext');
          } else {
            db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)').run('chat.setupContext', enabledContext);
          }
          console.log(`[*] Set chat.setupContext (entitlement=6, installed=true) in ${path.basename(path.dirname(dbPath))}/state.vscdb`);

          // Always set hasByokModels=true so chat widget renders
          const byokRow = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get('chat.hasByokModels.lastKnown');
          if (byokRow) {
            db.prepare('UPDATE ItemTable SET value = ? WHERE key = ?').run('true', 'chat.hasByokModels.lastKnown');
          } else {
            db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)').run('chat.hasByokModels.lastKnown', 'true');
          }

          // Remove stale hidden panel state that could blank out the chat view
          db.prepare("DELETE FROM ItemTable WHERE key = 'workbench.panel.chat.hidden'").run();

          // Set active model to universal-ai provider
          const modelRow = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get('chat.currentLanguageModel.panel');
          if (modelRow) {
            db.prepare('UPDATE ItemTable SET value = ? WHERE key = ?').run('universal-ai/openai/gpt-oss-120b', 'chat.currentLanguageModel.panel');
          } else {
            db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)').run('chat.currentLanguageModel.panel', 'universal-ai/openai/gpt-oss-120b');
          }

          // Mark builtinChatExtensionEnablementMigration as true so it does not auto-disable
          const migRow = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get('builtinChatExtensionEnablementMigration');
          if (!migRow) {
            db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)').run('builtinChatExtensionEnablementMigration', 'true');
          } else {
            db.prepare('UPDATE ItemTable SET value = ? WHERE key = ?').run('true', 'builtinChatExtensionEnablementMigration');
          }

          db.close();
        } catch {}
      }
    } catch (e) {
      console.warn('[!] SQLite state sanitize notice:', e.message);
    }
  }

  // 5. Synchronize user extensions (Python, Universal AI, etc.) to .vscode-oss-dev
  const userProfile = process.env.USERPROFILE;
  if (userProfile) {
    const srcExtDir = path.join(userProfile, '.vscode', 'extensions');
    const destExtDir = path.join(userProfile, '.vscode-oss-dev', 'extensions');
    const repoUniversalAi = path.join(process.cwd(), 'extensions', 'universal-ai');

    try {
      fs.mkdirSync(destExtDir, { recursive: true });

      // Clean up deprecated universal-ai folder from .vscode-oss-dev/extensions (now runs natively in core)
      const targetAiDir = path.join(destExtDir, 'universal-ai');
      if (fs.existsSync(targetAiDir)) {
        try {
          fs.rmSync(targetAiDir, { recursive: true, force: true });
          console.log('[*] Removed deprecated universal-ai extension (Ares AI is now native in core).');
        } catch {}
      }

      // 2. Distribute .keys.json to candidate locations for core Ares AI
      const rootKeysPath = path.join(process.cwd(), '.keys.json');
      if (fs.existsSync(rootKeysPath)) {
        const keysContent = fs.readFileSync(rootKeysPath, 'utf8');
        const candidateKeyPaths = [
          path.join(userProfile, '.keys.json'),
          path.join(userProfile, '.vscode-oss-dev', '.keys.json'),
          path.join(process.cwd(), '.keys.json')
        ];
        for (const kp of candidateKeyPaths) {
          try {
            fs.mkdirSync(path.dirname(kp), { recursive: true });
            fs.writeFileSync(kp, keysContent, 'utf8');
          } catch {}
        }
        console.log('[*] Synchronized .keys.json to discovery paths.');
      }

      // Clean up extensions.json if universal-ai was previously registered
      const extJsonPath = path.join(destExtDir, 'extensions.json');
      if (fs.existsSync(extJsonPath)) {
        try {
          const exts = JSON.parse(fs.readFileSync(extJsonPath, 'utf8'));
          const cleanedExts = exts.filter(e => !e.identifier?.id?.toLowerCase().includes('universal'));
          if (cleanedExts.length !== exts.length) {
            fs.writeFileSync(extJsonPath, JSON.stringify(cleanedExts, null, 2), 'utf8');
            console.log('[*] Cleaned universal-ai from extensions.json.');
          }
        } catch (e) {
          console.warn('[!] Notice updating extensions.json:', e.message);
        }
      }

      // Purge any stale .obsolete file that would block extensions from loading
      const obsoletePath = path.join(destExtDir, '.obsolete');
      if (fs.existsSync(obsoletePath)) {
        try {
          fs.rmSync(obsoletePath, { force: true });
          console.log('[*] Removed stale .obsolete file.');
        } catch {}
      }

      // Sync installed extensions (Python, Pylance, Debugpy, etc.) if missing
      if (fs.existsSync(srcExtDir)) {
        const entries = fs.readdirSync(srcExtDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.includes('copilot') || entry.name.includes('universal')) continue;
          const destPath = path.join(destExtDir, entry.name);
          if (!fs.existsSync(destPath)) {
            const srcPath = path.join(srcExtDir, entry.name);
            fs.cpSync(srcPath, destPath, { recursive: true, force: true });
            console.log(`[*] Synced extension ${entry.name} to desktop environment.`);
          }
        }
      }
    } catch (e) {
      console.warn('[!] Extension sync notice:', e.message);
    }
  }

  // 6. Ensure node-pty conpty binaries (conpty.dll, OpenConsole.exe) are present
  const conptyDll = path.join(process.cwd(), 'node_modules', 'node-pty', 'build', 'Release', 'conpty', 'conpty.dll');
  if (!fs.existsSync(conptyDll)) {
    try {
      execSync('node node_modules/node-pty/scripts/post-install.js', { stdio: 'ignore' });
      console.log('[*] Restored node-pty conpty.dll and OpenConsole.exe binaries.');
    } catch (e) {
      console.warn('[!] Failed to restore conpty.dll:', e.message);
    }
  }

  console.log('[*] Environment is clean. Ready for single-window launch.');
}

await prepareDesktop();
