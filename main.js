const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: '#0f1117',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Workbook',
  });

  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });
}

/* -----------------------------------------------
   IPC — Send email via Outlook COM (PowerShell)
----------------------------------------------- */
ipcMain.handle('send-outlook-email', async (_event, { to, cc, subject, body }) => {
  // Escape single quotes for PowerShell string literals
  const esc = (s) => (s || '').replace(/'/g, "''");

  const script = `
try {
  $outlook = New-Object -ComObject Outlook.Application
  $mail    = $outlook.CreateItem(0)
  $mail.To      = '${esc(to)}'
  $mail.CC      = '${esc(cc)}'
  $mail.Subject = '${esc(subject)}'
  $mail.Body    = '${esc(body)}'
  $mail.Send()
  Write-Output 'OK'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
  `.trim();

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 30000 },
      (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || err.message });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

/* -----------------------------------------------
   IPC — Get Unread emails via Outlook COM
----------------------------------------------- */
ipcMain.handle('get-outlook-unread', async () => {
  // PowerShell para obtener hasta 20 mails no leídos de la bandeja de entrada
  const script = `
try {
  $outlook = New-Object -ComObject Outlook.Application
  $namespace = $outlook.GetNamespace("MAPI")
  $inbox = $namespace.GetDefaultFolder(6) # olFolderInbox
  
  $items = $inbox.Items
  $items.Sort("[ReceivedTime]", $true) # true = descendente
  
  # Filtrar solo elementos de correo (clase 43) y no leídos
  $unread = @()
  foreach ($item in $items) {
    if ($unread.Count -ge 20) { break }
    if ($item.Class -eq 43 -and $item.UnRead -eq $true) {
      $unread += @{
        id       = $item.EntryID
        sender   = $item.SenderName
        email    = $item.SenderEmailAddress
        subject  = $item.Subject
        body     = $item.Body
        received = $item.ReceivedTime.ToString("o")
      }
    }
  }
  
  $result = @{
    success = $true
    emails  = $unread
  }
  
  $json = $result | ConvertTo-Json -Depth 3 -Compress
  Write-Output $json
} catch {
  $errorResult = @{ success = $false; error = $_.Exception.Message }
  $json = $errorResult | ConvertTo-Json -Compress
  Write-Output $json
  exit 1
}
  `.trim();

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 30000 },
      (err, stdout, stderr) => {
        if (err && !stdout) {
          resolve({ success: false, error: stderr || err.message });
          return;
        }
        try {
          // El stdout debe ser JSON válido, a menos que se hayan impreso basuras antes
          const lastLineMatch = stdout.trim().match(/\\{.*\\}$/);
          const rawJson = lastLineMatch ? lastLineMatch[0] : stdout.trim();
          const parsed = JSON.parse(rawJson);
          resolve(parsed);
        } catch (e) {
          resolve({ success: false, error: 'Error parseando JSON: ' + e.message + ' Stdout: ' + stdout });
        }
      }
    );
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
