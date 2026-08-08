param(
  [int]$Port = 8766
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$loopback = [System.Net.IPAddress]::Loopback
$listener = New-Object System.Net.Sockets.TcpListener($loopback, $Port)

function Get-MimeType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".css"  { return "text/css; charset=utf-8" }
    ".js"   { return "text/javascript; charset=utf-8" }
    ".mjs"  { return "text/javascript; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".svg"  { return "image/svg+xml" }
    ".png"  { return "image/png" }
    ".jpg"  { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".webp" { return "image/webp" }
    ".ico"  { return "image/x-icon" }
    default  { return "application/octet-stream" }
  }
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [byte[]]$Body,
    [string]$ContentType = "text/plain; charset=utf-8",
    [bool]$HeadOnly = $false
  )

  if ($null -eq $Body) { $Body = [byte[]]::new(0) }
  $header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store, no-cache, must-revalidate`r`nPragma: no-cache`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

try {
  $listener.Start()
  $url = "http://127.0.0.1:$Port/?v2firebase=1"

  Write-Host ""
  Write-Host "============================================================"
  Write-Host " CORPO NU FLOW V2 - FIREBASE REAL"
  Write-Host " SOMENTE LEITURA - NENHUMA GRAVACAO LIBERADA"
  Write-Host "============================================================"
  Write-Host ""
  Write-Host "Servidor local iniciado em: $url"
  Write-Host "O painel V2 vai usar o Firebase real apenas para leitura."
  Write-Host "Nao precisa de Node.js nem Python."
  Write-Host ""
  Write-Host "Mantenha esta janela aberta enquanto estiver validando."
  Write-Host "Para encerrar, feche esta janela ou pressione Ctrl+C."
  Write-Host ""

  Start-Process $url

  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 8192, $true)
      $requestLine = $reader.ReadLine()

      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }

      while ($true) {
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line -eq "") { break }
      }

      $parts = $requestLine.Split(" ")
      if ($parts.Length -lt 2) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Requisicao invalida.")
        Send-Response -Stream $stream -StatusCode 400 -StatusText "Bad Request" -Body $body
        continue
      }

      $method = $parts[0].ToUpperInvariant()
      $isHead = $method -eq "HEAD"
      if ($method -ne "GET" -and -not $isHead) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Metodo nao permitido.")
        Send-Response -Stream $stream -StatusCode 405 -StatusText "Method Not Allowed" -Body $body
        continue
      }

      $rawPath = $parts[1].Split("?")[0]
      $requestPath = [System.Uri]::UnescapeDataString($rawPath)
      if ($requestPath -eq "/") { $requestPath = "/index.html" }

      $relative = $requestPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
      $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
      $rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

      if (-not $candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Acesso negado.")
        Send-Response -Stream $stream -StatusCode 403 -StatusText "Forbidden" -Body $body
        continue
      }

      if (Test-Path -LiteralPath $candidate -PathType Container) {
        $candidate = Join-Path $candidate "index.html"
      }

      if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Arquivo nao encontrado.")
        Send-Response -Stream $stream -StatusCode 404 -StatusText "Not Found" -Body $body
        continue
      }

      $bytes = [System.IO.File]::ReadAllBytes($candidate)
      Send-Response -Stream $stream -StatusCode 200 -StatusText "OK" -Body $bytes -ContentType (Get-MimeType $candidate) -HeadOnly $isHead
    }
    catch {
      try {
        if ($null -ne $stream -and $stream.CanWrite) {
          $body = [System.Text.Encoding]::UTF8.GetBytes("Erro interno do servidor local.")
          Send-Response -Stream $stream -StatusCode 500 -StatusText "Internal Server Error" -Body $body
        }
      } catch {}
    }
    finally {
      if ($null -ne $reader) { $reader.Dispose() }
      if ($null -ne $stream) { $stream.Dispose() }
      $client.Close()
      $reader = $null
      $stream = $null
    }
  }
}
catch {
  Write-Host ""
  Write-Host "Nao foi possivel iniciar a validacao Firebase V2." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ""
  Write-Host "Se a porta 8766 ja estiver em uso, feche outra validacao aberta e tente novamente."
  Read-Host "Pressione ENTER para fechar"
  exit 1
}
finally {
  if ($null -ne $listener) {
    try { $listener.Stop() } catch {}
  }
}
