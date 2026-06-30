const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;

let mainWindow;
let serverProcess;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function waitForServer(url, timeoutMs = 30000) {
  const http = require("http");
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error("Timed out waiting for the server to start"));
        } else {
          setTimeout(tryOnce, 300);
        }
      });
    };
    tryOnce();
  });
}

function ensureUserDb() {
  const userDataDir = app.getPath("userData");
  const dbPath = path.join(userDataDir, "sqlite.db");

  if (!fs.existsSync(dbPath)) {
    const seedDbPath = path.join(process.resourcesPath, "standalone", "sqlite.db");
    if (fs.existsSync(seedDbPath)) {
      fs.copyFileSync(seedDbPath, dbPath);
    }
  }

  return dbPath;
}

async function startProductionServer() {
  const port = await getFreePort();
  const standaloneDir = path.join(process.resourcesPath, "standalone");
  const serverEntry = path.join(standaloneDir, "server.js");
  const dbPath = ensureUserDb();

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      SQLITE_DB_PATH: dbPath,
    },
    stdio: "pipe",
  });

  serverProcess.stdout.on("data", (data) => console.log(`[server] ${data}`));
  serverProcess.stderr.on("data", (data) => console.error(`[server] ${data}`));

  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  let startUrl;
  if (isDev) {
    startUrl = "http://localhost:8000";
    serverProcess = spawn("npm run dev-electron", {
      cwd: __dirname,
      stdio: "pipe",
      shell: true,
    });
    serverProcess.stdout.on("data", (data) => console.log(`[next-dev] ${data}`));
    serverProcess.stderr.on("data", (data) => console.error(`[next-dev] ${data}`));
    await waitForServer(startUrl);
    mainWindow.webContents.openDevTools();
  } else {
    startUrl = await startProductionServer();
  }

  await mainWindow.loadURL(startUrl);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  stopServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("before-quit", stopServer);
