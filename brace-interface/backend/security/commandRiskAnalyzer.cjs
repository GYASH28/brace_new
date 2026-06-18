const BLOCKED_PATTERNS = [
  // System destruction / formatting
  /\b(format|cipher\s+\/w|diskpart|bcdedit)\b/i,
  // Registry / persistence / scheduled tasks
  /\b(reg\s+delete|Set-ItemProperty\s+.*\\Run|schtasks\s+\/create)\b/i,
  // Firewall / antivirus tampering
  /\b(netsh\s+advfirewall\s+set|Set-MpPreference|DisableRealtimeMonitoring)\b/i,
  // Credential theft
  /\b(mimikatz|lsass|procdump.*lsass|credential|dumpcred|sekurlsa)\b/i,
  // Keylogging / hooking
  /\b(keylogger|GetAsyncKeyState|SetWindowsHookEx)\b/i,
  // Recursive deletion of critical paths
  /\b(rm\s+-rf\s+\/|Remove-Item\s+.*-Recurse.*(?:C:\\|\\Windows|\\System32)|Remove-Item\s+.*(?:C:\\|\\Windows|\\System32).*-Recurse|del\s+\/[sq]\s+C:\\)/i,
  // Download-and-execute chains
  /\b(iwr|irm|curl|wget)\b.*\|\s*(iex|Invoke-Expression|powershell|pwsh|cmd|bash|sh)\b/i,
  /\bInvoke-WebRequest\b.*\bInvoke-Expression\b/i,
  // Encoded command execution (common malware vector)
  /\b(powershell|pwsh)\b.*-[eE]n?c?\s+[A-Za-z0-9+\/=]{20,}/i,
  // Base64 decode piped to execution
  /base64\s+(-d|--decode).*\|\s*(bash|sh|cmd|powershell)/i,
  // Disable event logging
  /\b(wevtutil\s+cl|Clear-EventLog|Stop-Service\s+.*eventlog)\b/i,
  // Shadow copy deletion (ransomware pattern)
  /\b(vssadmin\s+delete\s+shadows|wmic\s+shadowcopy\s+delete)\b/i,
  // Boot config tampering
  /\b(bcdedit\s+\/set|bootcfg|bcdboot)\b/i,
];

const HIGH_PATTERNS = [
  /\b(npm|pnpm|yarn|pip|uv|cargo|composer)\s+(install|add|update|upgrade)\b/i,
  /\b(git\s+push|git\s+clean|git\s+reset\s+--hard)\b/i,
  /\b(Remove-Item|rm|del|rmdir)\b/i,
  /\b(Start-Process\s+-Verb\s+RunAs|sudo|runas)\b/i,
  /\b(Set-ExecutionPolicy|New-Service|sc\s+create)\b/i,
  // Environment variable mutation
  /\b(setx|Set-EnvironmentVariable)\b/i,
  // Windows service manipulation
  /\b(sc\s+(stop|delete|config)|Stop-Service|Set-Service)\b/i,
  // Disk/partition operations
  /\b(chkdsk\s+\/f|sfc\s+\/scannow)\b/i,
];

const MEDIUM_PATTERNS = [
  /\b(npm|pnpm|yarn)\s+(run\s+)?(build|test|dev|lint)\b/i,
  /\b(git\s+(status|diff|log|branch|checkout|switch|pull|fetch))\b/i,
  /\b(node|python|py|powershell|pwsh|cmd)\b/i,
  // File/directory listing and inspection
  /\b(dir|ls|Get-ChildItem|tree)\b/i,
];

function analyzeCommandRisk(command) {
  const text = String(command ?? "").trim();
  if (!text) return { riskLevel: "blocked", reason: "Empty commands are not executable." };

  // Block commands with suspicious shell meta-characters chaining
  if (/;\s*(rm|del|Remove-Item|format|cipher)\b/i.test(text)) {
    return { riskLevel: "blocked", reason: "Command chains a destructive operation after a semicolon separator." };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { riskLevel: "blocked", reason: "Command matches a blocked destructive, credential, persistence, or download-execute pattern." };
    }
  }
  if (/^[\w.-]+(\.exe)?\s+(--version|-v|version)$/i.test(text)) {
    return { riskLevel: "low", reason: "Command only checks a tool version." };
  }
  for (const pattern of HIGH_PATTERNS) {
    if (pattern.test(text)) return { riskLevel: "high", reason: "Command may install packages, delete data, elevate privileges, or publish changes." };
  }
  for (const pattern of MEDIUM_PATTERNS) {
    if (pattern.test(text)) return { riskLevel: "medium", reason: "Command can execute code or inspect/modify project state." };
  }
  return { riskLevel: "low", reason: "Command appears read-only or low impact." };
}

module.exports = { analyzeCommandRisk, BLOCKED_PATTERNS, HIGH_PATTERNS, MEDIUM_PATTERNS };
