import { app, BrowserWindow, dialog } from 'electron';
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import fs from 'fs';
import net from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProd = app.isPackaged;

const laravelPath = isProd
    ? path.join(process.resourcesPath, 'laravel')
    : path.join(__dirname, '..');

const phpBin = isProd
    ? path.join(process.resourcesPath, 'php', 'php.exe')
    : 'php';

const phpRoot = isProd
    ? path.join(process.resourcesPath, 'php')
    : null;

const PHP_PORT = 8642;
let phpProcess = null;
let mainWindow = null;

function ensurePhpIni() {
    if (!isProd) return null;
    const iniPath = path.join(app.getPath('userData'), 'php.ini');

    // Always rewrite so ext path is always correct
    const extDir = path.join(phpRoot, 'ext').replace(/\\/g, '/');
    const content =
        `extension_dir = "${extDir}"\n` +
        `\n` +
        `; Only load extensions that exist as separate DLLs\n` +
        `extension=openssl\n` +
        `extension=pdo_sqlite\n` +
        `extension=sqlite3\n` +
        `extension=mbstring\n` +
        `extension=fileinfo\n` +
        `extension=curl\n` +
        `extension=intl\n` +
        `extension=sodium\n` +
        `\n` +
        `; dom, xml, bcmath, ctype, phar, iconv, tokenizer, json\n` +
        `; are built-in to php8ts.dll — do NOT list them here\n` +
        `\n` +
        `memory_limit = 256M\n` +
        `max_execution_time = 60\n` +
        `date.timezone = Asia/Manila\n`;

    fs.writeFileSync(iniPath, content, { encoding: 'ascii' });
    return iniPath;
}

function buildEnv() {
    const base = { ...process.env };
    if (isProd) {
        base.APP_ENV = 'production';
        base.APP_DEBUG = 'false';
        base.APP_URL = `http://127.0.0.1:${PHP_PORT}`;
        base.DB_CONNECTION = 'sqlite';
        base.DB_DATABASE = path.join(app.getPath('userData'), 'database.sqlite');
        base.STORAGE_PATH = path.join(app.getPath('userData'), 'storage');
        base.SESSION_DRIVER = 'file';
        base.CACHE_STORE = 'file';
        base.QUEUE_CONNECTION = 'sync';
    }
    return base;
}

function runArtisan(args) {
    return new Promise((resolve, reject) => {
        const artisan = path.join(laravelPath, 'artisan');
        const iniPath = ensurePhpIni();
        const phpArgs = iniPath
            ? ['-c', iniPath, artisan, ...args, '--no-interaction']
            : [artisan, ...args, '--no-interaction'];
        const proc = spawn(phpBin, phpArgs, {
            cwd: laravelPath, env: buildEnv(), windowsHide: true,
        });
        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`artisan ${args[0]} failed:\n${stderr}`));
        });
        proc.on('error', reject);
    });
}

// Kill any process already using our port
function freePort(port) {
    try {
        if (process.platform === 'win32') {
            const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const pids = [...new Set(result.trim().split('\n')
                .map(line => line.trim().split(/\s+/).pop())
                .filter(pid => pid && /^\d+$/.test(pid) && pid !== '0'))];
            pids.forEach(pid => {
                try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); } catch {}
            });
        }
    } catch {}
}

// Check if port is free
function isPortFree(port) {
    return new Promise(resolve => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => { server.close(); resolve(true); });
        server.listen(port, '127.0.0.1');
    });
}

function startPhp() {
    return new Promise((resolve, reject) => {
        const artisan = path.join(laravelPath, 'artisan');

        if (isProd) {
            try {
                fs.mkdirSync(path.join(app.getPath('userData'), 'storage'), { recursive: true });
            } catch {}
        }

        const iniPath = ensurePhpIni();
        const phpArgs = iniPath
            ? ['-c', iniPath, artisan, 'serve', '--host=127.0.0.1', `--port=${PHP_PORT}`, '--no-interaction']
            : [artisan, 'serve', '--host=127.0.0.1', `--port=${PHP_PORT}`, '--no-interaction'];

        phpProcess = spawn(phpBin, phpArgs, {
            cwd: laravelPath,
            env: buildEnv(),
            windowsHide: true,
        });

        let stderrAll = '';
        let stdoutAll = '';

        phpProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            stderrAll += msg;
            console.log('[PHP]', msg.trim());
            if (msg.includes('Server running')) resolve();
        });

        phpProcess.stdout.on('data', (data) => {
            const msg = data.toString();
            stdoutAll += msg;
            console.log('[PHP stdout]', msg.trim());
        });

        phpProcess.on('error', (err) => {
            reject(new Error(`PHP process failed to start:\n${err.message}`));
        });

        phpProcess.on('close', (code) => {
            if (code === 0) return;
            reject(new Error(
                `PHP process exited before the server started (code ${code}).\n\n` +
                `STDERR:\n${stderrAll || '(empty)'}\n\n` +
                `STDOUT:\n${stdoutAll || '(empty)'}`));
        });

        // Poll until server responds
        const poll = setInterval(() => {
            http.get(`http://127.0.0.1:${PHP_PORT}`, () => {
                clearInterval(poll);
                resolve();
            }).on('error', () => {});
        }, 500);

        // 60s timeout (increased from 30s)
        setTimeout(() => {
            clearInterval(poll);
            reject(new Error(
                `PHP server timed out after 60s.\n\n` +
                `This usually means PHP could not start or crashed.\n\n` +
                `STDERR (partial):\n${stderrAll.slice(-4000) || '(empty)'}\n\n` +
                `STDOUT (partial):\n${stdoutAll.slice(-4000) || '(empty)'}\n\n` +
                `Check that bundled PHP exists at:\n${phpBin}`));
        }, 60000);
    });
}

async function ensureDatabase() {
    if (!isProd) return;

    const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
    if (!fs.existsSync(dbPath)) {
        const seedDb = path.join(process.resourcesPath, 'laravel', 'database', 'database.sqlite');
        if (fs.existsSync(seedDb)) {
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
            fs.copyFileSync(seedDb, dbPath);
        }
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
        title: 'Payroll System',
        show: false,
    });

    mainWindow.loadURL(`http://127.0.0.1:${PHP_PORT}`);
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (!isProd) mainWindow.webContents.openDevTools();
    });
    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
    try {
        await ensureDatabase();

        // Kill anything already on our port before starting
        freePort(PHP_PORT);
        await new Promise(r => setTimeout(r, 500)); // brief wait after kill

        if (isProd) {
            await runArtisan(['storage:link', '--force']).catch(() => {});
        }

        await startPhp();
        createWindow();
    } catch (err) {
        dialog.showErrorBox('Startup Error', `Could not start the server:\n${err.message}`);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (phpProcess) phpProcess.kill();
    app.quit();
});

app.on('before-quit', () => {
    if (phpProcess) phpProcess.kill();
});
