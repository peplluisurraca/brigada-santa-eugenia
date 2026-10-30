param(
    [int]$Port = 8080,
    [string]$Root = $PSScriptRoot
)

if (-not $Root) {
    $Root = "C:\Users\jlurracam\.gemini\antigravity\scratch\brigada-mantenimiento"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " Servidor Web de la Brigada Municipal de Santa Eugènia" -ForegroundColor Green
    Write-Host " Disponible a: http://localhost:$Port/" -ForegroundColor Yellow
    Write-Host " Arrel de fitxers: $Root" -ForegroundColor Gray
    Write-Host " Prem Ctrl+C per aturar el servidor." -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Cyan

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/" -or [string]::IsNullOrWhiteSpace($localPath)) {
            $localPath = "/index.html"
        }

        $relative = $localPath.TrimStart('/').Replace('/', '\')
        $filePath = Join-Path $Root $relative

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".webp" { "image/webp" }
                Default { "application/octet-stream" }
            }
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("Fitxer no trobat (404)")
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "Error al servidor: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
