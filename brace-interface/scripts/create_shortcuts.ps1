$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")

$ShortcutServer = $WshShell.CreateShortcut("$DesktopPath\BRACE Server.lnk")
$ShortcutServer.TargetPath = "cmd.exe"
$ShortcutServer.Arguments = "/c cd c:\Users\Admin\Desktop\projects\B.R.A.C.E-MAIN\brace-interface && npm run backend:localhost"
$ShortcutServer.IconLocation = "cmd.exe"
$ShortcutServer.Description = "Start B.R.A.C.E Backend Server"
$ShortcutServer.Save()

$ShortcutExe = $WshShell.CreateShortcut("$DesktopPath\B.R.A.C.E.lnk")
$ShortcutExe.TargetPath = "c:\Users\Admin\Desktop\projects\B.R.A.C.E-MAIN\brace-interface\release\B.R.A.C.E-1.0.0-x64.exe"
$ShortcutExe.WorkingDirectory = "c:\Users\Admin\Desktop\projects\B.R.A.C.E-MAIN\brace-interface\release"
$ShortcutExe.Description = "Launch B.R.A.C.E App"
$ShortcutExe.Save()
