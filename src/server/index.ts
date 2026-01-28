import { Hono } from "hono";
import { html } from "hono/html";
import Database from "better-sqlite3";
import { sessionsRoutes } from "./routes/sessions.js";
import { streamRoute } from "./routes/stream.js";
import { corsMiddleware } from "./middleware/cors.js";
import { DEFAULT_SERVER_PORT, DATABASE_PATH } from "../utils/paths.js";
import { initializeSchema } from "../db/schema.js";

export interface ServerOptions {
  port?: number;
  host?: string;
}

export function createApp() {
  const app = new Hono();

  app.use("*", corsMiddleware());

  app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

  // Simple HTML dashboard (mobile-first)
  app.get("/", (c) => {
    return c.html(html`
      <!DOCTYPE html>
      <html>
      <head>
        <title>claude-watch</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
        <style>
          iconify-icon { font-size: 18px; }
          iconify-icon.spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, system-ui, sans-serif;
            background: #0a0a0a;
            color: #eee;
            padding: 16px;
            margin: 0;
            min-height: 100vh;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #222;
          }
          h1 { color: #fff; font-size: 24px; margin: 0; }
          .btn {
            background: #333;
            color: #fff;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            cursor: pointer;
            border-radius: 8px;
            touch-action: manipulation;
          }
          .btn:active { background: #444; }
          .btn.paused { background: #c0392b; }
          .session {
            padding: 16px;
            margin: 12px 0;
            background: #1a1a1a;
            border-radius: 12px;
            border-left: 4px solid #444;
            touch-action: manipulation;
          }
          .session.permission, .session.waiting { border-left-color: #e74c3c; }
          .session.idle { border-left-color: #f39c12; }
          .session.busy { border-left-color: #27ae60; }
          .session-header { display: flex; align-items: center; margin-bottom: 8px; }
          .state {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            margin-right: 12px;
            flex-shrink: 0;
          }
          .target { font-weight: 600; font-size: 18px; }
          .action {
            color: #aaa;
            font-size: 15px;
            margin-bottom: 6px;
          }
          .cwd {
            color: #666;
            font-size: 13px;
            word-break: break-all;
          }
          .empty { color: #555; text-align: center; padding: 40px; font-size: 16px; }
          .count { color: #666; font-size: 14px; margin: 0 0 16px 0; }
          .project-group { margin-bottom: 20px; }
          .project-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 8px 8px 0 0;
            font-weight: 700;
            font-size: 16px;
          }
          .project-header .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .project-header button {
            background: transparent;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #888;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .project-header button:hover { color: #fff; }
          .project-header button.delete:hover { color: #e74c3c; }
          .project-sessions .session {
            border-radius: 0;
            margin: 0;
            border-top: 1px solid #333;
          }
          .project-sessions .session:last-child {
            border-radius: 0 0 8px 8px;
          }
          .session-info { cursor: default; }
          .session-info.clickable { cursor: pointer; }
          .session-info.clickable:hover { background: #252525; border-radius: 8px; }
          .session-info.clickable:active { opacity: 0.7; }
          .actions { margin-top: 10px; display: flex; gap: 8px; }
          .actions button {
            background: #333;
            color: #fff;
            border: none;
            padding: 12px 18px;
            font-size: 16px;
            border-radius: 6px;
            cursor: pointer;
            min-width: 44px;
            min-height: 44px;
            touch-action: manipulation;
            -webkit-tap-highlight-color: rgba(255,255,255,0.2);
          }
          .actions button:active { background: #555; }
          .project-header button {
            min-width: 44px;
            min-height: 44px;
            touch-action: manipulation;
            -webkit-tap-highlight-color: rgba(255,255,255,0.2);
          }
          .actions button.danger { background: #c0392b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>claude-watch</h1>
          <button class="btn" onclick="newProject()"><iconify-icon icon="ph:folder-plus"></iconify-icon></button>
          <button class="btn" id="toggleBtn" onclick="toggle()"><iconify-icon icon="ph:pause"></iconify-icon></button>
        </div>
        <p class="count" id="count">Loading...</p>
        <div id="sessions"></div>
        <script>
          let paused = false;
          let lastData = '';

          function stateColor(s) {
            if (s === 'permission' || s === 'waiting') return '#e74c3c';
            if (s === 'idle') return '#f39c12';
            if (s === 'busy') return '#27ae60';
            return '#555';
          }

          const projectColors = ['#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a', '#ff5722'];

          function getProjectColor(cwd) {
            let hash = 0;
            for (let i = 0; i < cwd.length; i++) {
              hash = ((hash << 5) - hash) + cwd.charCodeAt(i);
              hash = hash & hash;
            }
            return projectColors[Math.abs(hash) % projectColors.length];
          }

          function getProjectName(cwd) {
            return cwd.split('/').filter(Boolean).pop() || cwd;
          }

          // Saved projects in localStorage
          function getSavedProjects() {
            try {
              return JSON.parse(localStorage.getItem('claude-watch-projects') || '[]');
            } catch { return []; }
          }

          function saveProject(cwd) {
            const projects = getSavedProjects();
            if (!projects.includes(cwd)) {
              projects.push(cwd);
              localStorage.setItem('claude-watch-projects', JSON.stringify(projects));
            }
          }

          function removeProject(cwd) {
            const projects = getSavedProjects().filter(p => p !== cwd);
            localStorage.setItem('claude-watch-projects', JSON.stringify(projects));
          }

          async function deleteProject(cwd, sessions) {
            // Kill all sessions in this project
            for (const s of sessions) {
              await fetch('/api/sessions/' + encodeURIComponent(s.id) + '/kill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pid: s.pid, tmux_target: s.tmux_target })
              });
            }
            // Remove from localStorage
            removeProject(cwd);
            lastData = ''; // Force refresh
            refresh();
          }

          async function refresh() {
            if (paused) return;
            try {
              const res = await fetch('/api/sessions');
              const data = await res.json();
              const dataStr = JSON.stringify(data.sessions);
              const savedProjects = getSavedProjects();
              const cacheKey = dataStr + JSON.stringify(savedProjects);
              if (cacheKey === lastData) return;
              lastData = cacheKey;
              document.getElementById('count').textContent = data.count + ' session(s)';
              const el = document.getElementById('sessions');

              // Group sessions by project (cwd)
              const groups = {};
              data.sessions.forEach(s => {
                const key = s.cwd || 'unknown';
                if (!groups[key]) groups[key] = [];
                groups[key].push(s);
                // Auto-save projects with active sessions
                saveProject(key);
              });

              // Add saved projects that have no active sessions
              savedProjects.forEach(cwd => {
                if (!groups[cwd]) groups[cwd] = [];
              });

              // Sort projects alphabetically
              const sortedProjects = Object.keys(groups).sort();

              if (sortedProjects.length === 0) {
                el.innerHTML = '<p class="empty">No projects. Click + to add one.</p>';
              } else {
                el.innerHTML = sortedProjects.map(cwd => {
                  const sessions = groups[cwd];
                  const color = getProjectColor(cwd);
                  const name = getProjectName(cwd);
                  const sessionsJson = JSON.stringify(sessions).replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
                  return '<div class="project-group">' +
                    '<div class="project-header" style="background:' + color + '22;border-left:4px solid ' + color + '">' +
                      '<span class="dot" style="background:' + color + '"></span>' +
                      '<span>' + name + '</span>' +
                      '<span style="font-weight:400;font-size:12px;color:#888;margin-left:auto">' + sessions.length + '</span>' +
                      '<button onclick="event.stopPropagation();newSessionInProject(\\'' + cwd.replace(/'/g, "\\\\'") + '\\')"><iconify-icon icon="ph:plus"></iconify-icon></button>' +
                      '<button class="delete" onclick="event.stopPropagation();deleteProject(\\'' + cwd.replace(/'/g, "\\\\'") + '\\', JSON.parse(decodeURIComponent(\\'' + encodeURIComponent(JSON.stringify(sessions)) + '\\')))"><iconify-icon icon="ph:trash"></iconify-icon></button>' +
                    '</div>' +
                    (sessions.length > 0 ? '<div class="project-sessions">' +
                      sessions.map(s => {
                        const isLocal = !s.tmux_target;
                        const targetDisplay = s.pane_title || s.tmux_target || '—';
                        const clickHandler = isLocal ? '' : 'onclick="openSession(\\'' + s.tmux_target + '\\')"';
                        const clickableClass = isLocal ? '' : ' clickable';
                        return '<div class="session ' + s.state + '" style="border-left-color:' + color + '">' +
                          '<div class="session-info' + clickableClass + '" ' + clickHandler + '>' +
                            '<div class="session-header">' +
                              '<span class="state" style="background:' + stateColor(s.state) + '"></span>' +
                              '<span class="target">' + targetDisplay + '</span>' +
                            '</div>' +
                            '<div class="action">' + (s.current_action || s.state) + '</div>' +
                          '</div>' +
                          '<div class="actions">' +
                            (isLocal ? '' : '<button onclick="send(\\'' + s.tmux_target + '\\', \\'Escape\\')"><iconify-icon icon="ph:stop"></iconify-icon></button>') +
                            (isLocal ? '' : '<button onclick="copyCmd(\\'' + s.tmux_target + '\\')"><iconify-icon icon="ph:copy"></iconify-icon></button>') +
                            '<button onclick="killSession(\\'' + s.id + '\\', ' + s.pid + ', \\'' + (s.tmux_target || '') + '\\', this)" class="kill-btn"><iconify-icon icon="ph:skull"></iconify-icon></button>' +
                          '</div>' +
                        '</div>';
                      }).join('') +
                    '</div>' : '') +
                  '</div>';
                }).join('');
              }
            } catch (e) { console.error(e); }
          }

          function toggle() {
            paused = !paused;
            const btn = document.getElementById('toggleBtn');
            btn.innerHTML = paused ? '<iconify-icon icon="ph:play"></iconify-icon>' : '<iconify-icon icon="ph:pause"></iconify-icon>';
            btn.className = paused ? 'btn paused' : 'btn';
          }

          async function send(target, keys) {
            await fetch('/api/sessions/' + encodeURIComponent(target) + '/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keys })
            });
            refresh();
          }

          async function copyCmd(target) {
            const cmd = 'tmux attach -t "' + target + '"';
            try {
              await navigator.clipboard.writeText(cmd);
            } catch (e) {}
          }

          async function killSession(id, pid, tmuxTarget, btn) {
            if (btn) {
              btn.disabled = true;
              btn.innerHTML = '<iconify-icon icon="ph:spinner" class="spin"></iconify-icon>';
            }
            try {
              const res = await fetch('/api/sessions/' + encodeURIComponent(id) + '/kill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pid, tmux_target: tmuxTarget })
              });
              if (res.ok) {
                // Remove from UI immediately
                if (btn) btn.closest('.session').remove();
              }
            } catch (e) {
              console.error('Kill failed:', e);
              if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<iconify-icon icon="ph:skull"></iconify-icon>';
              }
            }
            refresh();
          }

          async function newSessionInProject(cwd) {
            await fetch('/api/projects/new-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cwd })
            });
            // Force refresh even if paused
            const wasPaused = paused;
            paused = false;
            await refresh();
            paused = wasPaused;
          }

          async function newProject() {
            showModal('New Project', 'Path:', '', (cwd) => {
              fetch('/api/projects/new-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cwd })
              }).then(refresh);
            });
          }

          function showModal(title, label, defaultVal, onSubmit) {
            const modal = document.createElement('div');
            modal.id = 'modal';
            modal.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100">' +
              '<div style="background:#222;padding:20px;border-radius:12px;width:90%;max-width:300px">' +
                '<div style="font-weight:600;margin-bottom:12px">' + title + '</div>' +
                '<div style="margin-bottom:8px">' + label + '</div>' +
                '<input type="text" id="modalInput" value="' + (defaultVal || '').replace(/"/g, '&quot;') + '" style="width:100%;padding:12px;border:1px solid #444;border-radius:6px;background:#111;color:#fff;font-size:16px;box-sizing:border-box">' +
                '<div style="display:flex;gap:8px;margin-top:12px">' +
                  '<button onclick="document.getElementById(\\'modal\\').remove()" style="flex:1;padding:12px;background:#444;border:none;border-radius:6px;color:#fff;font-size:16px">Cancel</button>' +
                  '<button id="modalOk" style="flex:1;padding:12px;background:#3498db;border:none;border-radius:6px;color:#fff;font-size:16px">OK</button>' +
                '</div>' +
              '</div>' +
            '</div>';
            document.body.appendChild(modal);
            const input = document.getElementById('modalInput');
            input.focus();
            input.select();
            document.getElementById('modalOk').onclick = () => {
              const val = input.value.trim();
              modal.remove();
              if (val) onSubmit(val);
            };
            input.onkeypress = (e) => { if (e.key === 'Enter') document.getElementById('modalOk').click(); };
          }

          function openSession(target) {
            window.location.href = '/session/' + encodeURIComponent(target);
          }

          refresh();
          setInterval(refresh, 1000);
        </script>
      </body>
      </html>
    `);
  });

  // Send keys to tmux pane
  app.post("/api/sessions/:target/send", async (c) => {
    const target = decodeURIComponent(c.req.param("target"));
    const body = await c.req.json();
    const keys = body.keys || "Escape";
    const text = body.text; // For literal text input
    try {
      const { execSync } = await import("child_process");
      if (text) {
        // Send literal text then Enter
        execSync(`tmux send-keys -t "${target}" -l ${JSON.stringify(text)}`, { stdio: "ignore" });
        execSync(`tmux send-keys -t "${target}" Enter`, { stdio: "ignore" });
      } else {
        execSync(`tmux send-keys -t "${target}" ${keys}`, { stdio: "ignore" });
      }
      return c.json({ ok: true });
    } catch {
      return c.json({ error: "Failed to send keys" }, 500);
    }
  });

  // Kill session (tmux or local process)
  app.post("/api/sessions/:id/kill", async (c) => {
    const id = decodeURIComponent(c.req.param("id"));
    const body = await c.req.json().catch(() => ({}));
    const { pid, tmux_target } = body;

    try {
      const { execSync } = await import("child_process");

      if (tmux_target) {
        // Kill tmux session
        const session = tmux_target.split(":")[0];
        execSync(`tmux kill-session -t "${session}" 2>/dev/null || true`, { stdio: "ignore" });
      } else if (pid && pid > 0) {
        // Kill process directly for non-tmux sessions
        execSync(`kill ${pid} 2>/dev/null || true`, { stdio: "ignore" });
      }

      // Remove from database by id
      try {
        const db = new Database(DATABASE_PATH);
        initializeSchema(db);
        db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
        db.close();
      } catch {
        // Database cleanup is best-effort
      }
      return c.json({ ok: true });
    } catch {
      // Even if kill fails, clean up database
      try {
        const db = new Database(DATABASE_PATH);
        initializeSchema(db);
        db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
        db.close();
      } catch {
        // Ignore
      }
      return c.json({ ok: true });
    }
  });

  // Create new session in project
  app.post("/api/projects/new-session", async (c) => {
    const { cwd } = await c.req.json();
    if (!cwd) {
      return c.json({ error: "cwd required" }, 400);
    }

    // Check if the folder exists
    const fs = await import("fs");
    if (!fs.existsSync(cwd)) {
      return c.json({ error: "Folder does not exist" }, 400);
    }
    const stat = fs.statSync(cwd);
    if (!stat.isDirectory()) {
      return c.json({ error: "Path is not a directory" }, 400);
    }

    try {
      const { execSync } = await import("child_process");
      // Create new tmux window and run claude in the specified directory
      const sessionName = "claude-" + Date.now();
      const tmuxTarget = sessionName + ":1.1";
      execSync(`tmux new-session -d -s "${sessionName}" -c "${cwd}" -- claude --dangerously-skip-permissions`, { stdio: "ignore" });

      // Add to database immediately so it shows up in UI
      try {
        const db = new Database(DATABASE_PATH);
        initializeSchema(db);
        const id = crypto.randomUUID();
        console.log("[new-session] Inserting:", { id, cwd, tmuxTarget });
        db.prepare(`
          INSERT INTO sessions (id, pid, cwd, tmux_target, state, last_update)
          VALUES (?, 0, ?, ?, 'idle', ?)
        `).run(id, cwd, tmuxTarget, Date.now());
        console.log("[new-session] Insert successful");
        db.close();
      } catch (err) {
        console.error("[new-session] Database insert failed:", err);
      }

      return c.json({ ok: true, session: sessionName });
    } catch (e) {
      return c.json({ error: "Failed to create session" }, 500);
    }
  });

  // Get tmux pane output
  app.get("/api/sessions/:target/output", async (c) => {
    const target = decodeURIComponent(c.req.param("target"));
    try {
      const { execSync } = await import("child_process");
      const output = execSync(`tmux capture-pane -t "${target}" -p -S -100`, { encoding: "utf-8" });
      return c.json({ output, timestamp: Date.now() });
    } catch {
      return c.json({ error: "Failed to capture pane" }, 500);
    }
  });

  // Session detail page (mobile-first chat UI)
  app.get("/session/:target", (c) => {
    const target = decodeURIComponent(c.req.param("target"));
    return c.html(html`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${target}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
        <style>
          iconify-icon { font-size: 18px; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; overflow: hidden; }
          body {
            font-family: -apple-system, system-ui, sans-serif;
            background: #000;
            color: #fff;
            display: flex;
            flex-direction: column;
            position: fixed;
            width: 100%;
          }
          .header {
            padding: 16px;
            background: #111;
            display: flex;
            align-items: center;
            gap: 16px;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .back { background: #222; border: none; font-size: 16px; padding: 8px 10px; border-radius: 8px; color: #aaa; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; text-decoration: none; }
          .back:hover { color: #fff; background: #333; }
          .header-btns { display: flex; gap: 6px; margin-left: auto; align-items: center; }
          .header-btns button { background: #222; border: none; font-size: 16px; padding: 8px 10px; border-radius: 8px; color: #aaa; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
          .header-btns button:hover { color: #fff; background: #333; }
          .header-btns button:active { background: #444; transform: scale(0.95); }
          .header-btns button.stop { background: #b91c1c; color: #fff; }
          .header-btns button.stop:hover { background: #dc2626; }
          .header-btns button.kill { background: #581c87; color: #fff; }
          .header-btns button.kill:hover { background: #7c3aed; }
          .title-row { display: flex; align-items: center; gap: 8px; }
          .state-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; background: #555; }
          .title { font-size: 17px; font-weight: 600; }
          .status { font-size: 13px; color: #888; }
          .output {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            font-size: 15px;
            line-height: 1.6;
            background: #000;
            -webkit-overflow-scrolling: touch;
          }
          .output pre {
            white-space: pre;
            font-family: ui-monospace, monospace;
            font-size: 10px;
            line-height: 1.3;
            color: #ccc;
            background: #111;
            padding: 12px;
            border-radius: 12px;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
          }
          .toolbar {
            display: flex;
            background: #111;
            padding: 4px;
          }
          .toolbar button {
            flex: 1;
            background: transparent;
            border: none;
            padding: 8px 0;
            font-size: 16px;
            color: #aaa;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
            border-radius: 6px;
          }
          .toolbar button:hover { color: #fff; background: #222; }
          .toolbar button:active { background: #333; transform: scale(0.95); }
          .input-row {
            padding: 12px 16px 24px;
            background: #111;
            display: flex;
            gap: 10px;
          }
          .input-row input {
            flex: 1;
            background: #222;
            border: 2px solid transparent;
            color: #fff;
            padding: 14px 16px;
            font-size: 16px;
            border-radius: 24px;
            outline: none;
            transition: border-color 0.15s;
          }
          .input-row input:focus { border-color: #3b82f6; }
          .input-row input::placeholder { color: #555; }
          .input-row button {
            background: #3b82f6;
            color: #fff;
            border: none;
            width: 48px;
            height: 48px;
            font-size: 20px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.15s;
          }
          .input-row button:hover { background: #60a5fa; }
          .input-row button:active { background: #2563eb; transform: scale(0.95); }
        </style>
      </head>
      <body>
        <div class="header">
          <a href="/" class="back"><iconify-icon icon="ph:caret-left"></iconify-icon></a>
          <span class="state-dot" id="stateDot"></span>
          <div>
            <div class="title" id="title">${target}</div>
            <div class="status" id="status">Connecting...</div>
          </div>
          <div class="header-btns">
            <button onclick="copyCmd()"><iconify-icon icon="ph:copy"></iconify-icon></button>
            <button class="stop" onclick="send('Escape')"><iconify-icon icon="ph:hand-palm"></iconify-icon></button>
            <button class="kill" onclick="killSession()"><iconify-icon icon="ph:power"></iconify-icon></button>
          </div>
        </div>
        <div class="output" id="output">
          <pre id="terminal">Loading...</pre>
        </div>
        <div class="toolbar">
          <button onclick="send('1 Enter')"><iconify-icon icon="ph:number-square-one"></iconify-icon></button>
          <button onclick="send('2 Enter')"><iconify-icon icon="ph:number-square-two"></iconify-icon></button>
          <button onclick="send('3 Enter')"><iconify-icon icon="ph:number-square-three"></iconify-icon></button>
          <button onclick="send('4 Enter')"><iconify-icon icon="ph:number-square-four"></iconify-icon></button>
          <button onclick="send('Up')"><iconify-icon icon="ph:arrow-up"></iconify-icon></button>
          <button onclick="send('Down')"><iconify-icon icon="ph:arrow-down"></iconify-icon></button>
          <button onclick="send('Space')"><iconify-icon icon="ph:keyboard"></iconify-icon></button>
          <button onclick="send('Tab')"><iconify-icon icon="ph:arrow-line-right"></iconify-icon></button>
          <button onclick="send('C-u')"><iconify-icon icon="ph:eraser"></iconify-icon></button>
          <button onclick="send('BTab')"><iconify-icon icon="ph:swap"></iconify-icon></button>
        </div>
        <div class="input-row">
          <input type="text" id="input" placeholder="Send a message..." autocomplete="off" autocorrect="off">
          <button onclick="sendInput()">↑</button>
        </div>
        <script>
          const target = "${target}";
          const terminal = document.getElementById('terminal');
          const status = document.getElementById('status');
          const stateDot = document.getElementById('stateDot');
          const titleEl = document.getElementById('title');
          const input = document.getElementById('input');
          const output = document.getElementById('output');
          let lastOutput = '';

          function stateColor(s) {
            if (s === 'permission' || s === 'waiting') return '#e74c3c';
            if (s === 'idle') return '#f39c12';
            if (s === 'busy') return '#27ae60';
            return '#555';
          }

          async function refresh() {
            try {
              const [outputRes, sessionsRes] = await Promise.all([
                fetch('/api/sessions/' + encodeURIComponent(target) + '/output'),
                fetch('/api/sessions')
              ]);
              const data = await outputRes.json();
              const sessionsData = await sessionsRes.json();

              // Update state dot and title from sessions data
              const session = sessionsData.sessions.find(s => s.tmux_target === target);
              if (session) {
                stateDot.style.background = stateColor(session.state);
                status.textContent = session.current_action || session.state;
                status.style.color = '#888';
                titleEl.textContent = session.pane_title || target;
              }

              if (data.output) {
                const trimmed = data.output.trim();
                if (trimmed !== lastOutput) {
                  lastOutput = trimmed;
                  terminal.textContent = trimmed;
                }
              }
            } catch (e) {
              status.textContent = 'Disconnected';
              status.style.color = '#ef4444';
              stateDot.style.background = '#555';
            }
          }

          async function send(keys) {
            status.textContent = 'Sending...';
            status.style.color = '#eab308';
            await fetch('/api/sessions/' + encodeURIComponent(target) + '/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keys })
            });
            setTimeout(refresh, 300);
          }

          async function sendInput() {
            const text = input.value.trim();
            input.value = '';
            if (!text) {
              await send('Enter');
              return;
            }
            status.textContent = 'Sending...';
            status.style.color = '#eab308';
            await fetch('/api/sessions/' + encodeURIComponent(target) + '/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text })
            });
            setTimeout(refresh, 300);
          }

          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendInput();
          });

          async function copyCmd() {
            const cmd = 'tmux attach -t "' + target + '"';
            try {
              await navigator.clipboard.writeText(cmd);
              status.textContent = 'Copied!';
              status.style.color = '#22c55e';
              setTimeout(refresh, 1000);
            } catch (e) {
              alert(cmd);
            }
          }

          function killSession() {
            showConfirm('Kill Session', 'Kill this session?', async () => {
              await fetch('/api/sessions/' + encodeURIComponent(target) + '/kill', { method: 'POST' });
              window.location.href = '/';
            });
          }

          function showConfirm(title, message, onConfirm) {
            const modal = document.createElement('div');
            modal.id = 'modal';
            modal.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100">' +
              '<div style="background:#222;padding:20px;border-radius:12px;width:90%;max-width:300px">' +
                '<div style="font-weight:600;margin-bottom:12px">' + title + '</div>' +
                '<div style="margin-bottom:16px;color:#aaa">' + message + '</div>' +
                '<div style="display:flex;gap:8px">' +
                  '<button onclick="document.getElementById(\\'modal\\').remove()" style="flex:1;padding:12px;background:#444;border:none;border-radius:6px;color:#fff;font-size:16px">Cancel</button>' +
                  '<button id="confirmOk" style="flex:1;padding:12px;background:#b91c1c;border:none;border-radius:6px;color:#fff;font-size:16px">Kill</button>' +
                '</div>' +
              '</div>' +
            '</div>';
            document.body.appendChild(modal);
            document.getElementById('confirmOk').onclick = () => {
              modal.remove();
              onConfirm();
            };
          }

          function showModal(title, label, defaultVal, onSubmit) {
            const modal = document.createElement('div');
            modal.id = 'modal';
            modal.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100">' +
              '<div style="background:#222;padding:20px;border-radius:12px;width:90%;max-width:300px">' +
                '<div style="font-weight:600;margin-bottom:12px">' + title + '</div>' +
                '<div style="margin-bottom:8px">' + label + '</div>' +
                '<input type="text" id="modalInput" value="' + (defaultVal || '').replace(/"/g, '&quot;') + '" style="width:100%;padding:12px;border:1px solid #444;border-radius:6px;background:#111;color:#fff;font-size:16px;box-sizing:border-box">' +
                '<div style="display:flex;gap:8px;margin-top:12px">' +
                  '<button onclick="document.getElementById(\\'modal\\').remove()" style="flex:1;padding:12px;background:#444;border:none;border-radius:6px;color:#fff;font-size:16px">Cancel</button>' +
                  '<button id="modalOk" style="flex:1;padding:12px;background:#3498db;border:none;border-radius:6px;color:#fff;font-size:16px">OK</button>' +
                '</div>' +
              '</div>' +
            '</div>';
            document.body.appendChild(modal);
            const input = document.getElementById('modalInput');
            input.focus();
            input.select();
            document.getElementById('modalOk').onclick = () => {
              const val = input.value.trim();
              modal.remove();
              if (val) onSubmit(val);
            };
            input.onkeypress = (e) => { if (e.key === 'Enter') document.getElementById('modalOk').click(); };
          }

          refresh();
          setInterval(refresh, 500);
        </script>
      </body>
      </html>
    `);
  });

  // Register stream route BEFORE sessions routes to prevent /:id from matching "stream"
  app.get("/api/sessions/stream", streamRoute);
  app.route("/api/sessions", sessionsRoutes);

  return app;
}

export function startServer(options: ServerOptions = {}) {
  const port = options.port ?? parseInt(process.env.CLAUDE_WATCH_PORT ?? String(DEFAULT_SERVER_PORT));
  const host = options.host ?? "127.0.0.1";

  const app = createApp();

  console.log(`claude-watch server running at http://${host}:${port}`);
  console.log(`  REST API: http://${host}:${port}/api/sessions`);
  console.log(`  SSE stream: http://${host}:${port}/api/sessions/stream`);

  // Use Bun.serve if available, otherwise fall back to node adapter
  if (typeof Bun !== "undefined") {
    return Bun.serve({
      fetch: app.fetch,
      port,
      hostname: host,
    });
  } else {
    // Fallback for Node.js - dynamic import to avoid bundling issues
    return import("@hono/node-server").then(({ serve }) => {
      return serve({
        fetch: app.fetch,
        port,
        hostname: host,
      });
    });
  }
}

export { createApp as default };
