<#
  Exécute du SQL sur la base Supabase via l'API Management.

  Contourne l'impossibilité de joindre Postgres en direct depuis certains
  réseaux (le protocole Postgres est filtré alors que le TCP passe).
  Le jeton est lu dans le gestionnaire d'identifiants Windows — celui que
  le CLI Supabase a déjà enregistré — et n'est jamais affiché.

  Usage :
    powershell -File scripts/supabase-sql.ps1 -ProjectRef <ref> -File migration.sql
    powershell -File scripts/supabase-sql.ps1 -ProjectRef <ref> -Query "SELECT 1"
#>
param(
  [Parameter(Mandatory = $true)][string]$ProjectRef,
  [string]$File,
  [string]$Query
)

$ErrorActionPreference = "Stop"

if (-not $File -and -not $Query) {
  Write-Error "Fournir -File ou -Query."
}

Add-Type -Namespace Cred -Name Store -MemberDefinition @'
[DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
public static extern bool CredReadW(string target, int type, int flags, out IntPtr credential);
[DllImport("advapi32.dll")]
public static extern void CredFree(IntPtr buffer);
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
public struct CREDENTIAL {
  public int Flags; public int Type; public string TargetName; public string Comment;
  public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
  public int CredentialBlobSize; public IntPtr CredentialBlob;
  public int Persist; public int AttributeCount; public IntPtr Attributes;
  public string TargetAlias; public string UserName;
}
'@

function Get-SupabaseToken {
  $ptr = [IntPtr]::Zero
  if (-not [Cred.Store]::CredReadW("Supabase CLI:supabase", 1, 0, [ref]$ptr)) {
    throw "Jeton Supabase introuvable. Exécuter d'abord : npx supabase login"
  }
  try {
    $cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [Type][Cred.Store+CREDENTIAL])
    $bytes = New-Object byte[] $cred.CredentialBlobSize
    [System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)

    # Le CLI Supabase écrit le jeton en UTF-8 ; d'autres outils utilisent
    # UTF-16. On retient l'encodage qui produit un jeton plausible (sbp_…).
    $utf8 = [System.Text.Encoding]::UTF8.GetString($bytes)
    if ($utf8 -match '^[\x20-\x7E]+$') { return $utf8.Trim() }

    return ([System.Text.Encoding]::Unicode.GetString($bytes)).Trim()
  }
  finally { [Cred.Store]::CredFree($ptr) }
}

$sql = if ($File) {
  [string]::Join("`n", (Get-Content -Path $File -Encoding UTF8))
}
else { [string]$Query }
$token = Get-SupabaseToken

$body = @{ query = $sql } | ConvertTo-Json -Depth 3 -Compress

try {
  $response = Invoke-RestMethod `
    -Uri "https://api.supabase.com/v1/projects/$ProjectRef/database/query" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body))

  $response | ConvertTo-Json -Depth 6 -Compress
}
catch {
  $detail = ""
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
  Write-Error "Echec SQL : $($_.Exception.Message) $detail"
}
finally {
  $token = $null
  [System.GC]::Collect()
}
