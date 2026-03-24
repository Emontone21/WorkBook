# send-email.ps1 — Referencia para envío via Outlook COM
# Uso: .\send-email.ps1 -To "dest@empresa.com" -Subject "Asunto" -Body "Cuerpo"
param(
  [Parameter(Mandatory=$true)]  [string]$To,
  [Parameter(Mandatory=$false)] [string]$CC = "",
  [Parameter(Mandatory=$true)]  [string]$Subject,
  [Parameter(Mandatory=$true)]  [string]$Body
)

try {
  $outlook = New-Object -ComObject Outlook.Application
  $mail    = $outlook.CreateItem(0)  # 0 = olMailItem
  $mail.To      = $To
  $mail.CC      = $CC
  $mail.Subject = $Subject
  $mail.Body    = $Body
  $mail.Send()
  Write-Host "Correo enviado correctamente."
} catch {
  Write-Error "Error al enviar: $_"
  exit 1
}
