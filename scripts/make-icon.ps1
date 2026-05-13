# Generate the ToolDeck icon (.ico) at multiple sizes.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File .\scripts\make-icon.ps1
[CmdletBinding()]
param(
    [string]$Out = (Join-Path $PSScriptRoot '..\assets\tooldeck.ico')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sizes = 16, 24, 32, 48, 64, 128, 256
$bitmaps = @()

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Rounded square in accent blue
    $accent = [System.Drawing.Color]::FromArgb(255, 124, 156, 255)
    $bg = [System.Drawing.Color]::FromArgb(255, 11, 13, 18)
    $radius = [Math]::Max(2, [int]($s / 6))

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rect = New-Object System.Drawing.RectangleF(0, 0, $s, $s)
    $d = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    $brush = New-Object System.Drawing.SolidBrush($accent)
    $g.FillPath($brush, $path)

    # Three horizontal bars (like menu / list rows)
    $pen = New-Object System.Drawing.Pen($bg)
    $pen.Width = [Math]::Max(1.0, [single]($s / 14))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $marginX = [single]($s * 0.22)
    $marginY = [single]($s * 0.27)
    $gap = [single](($s - 2 * $marginY) / 3)
    for ($i = 0; $i -lt 3; $i++) {
        $y = [single]($marginY + $i * $gap + $gap / 2)
        $endX = if ($i -eq 2) { $s - $marginX - [single]($s * 0.18) } else { $s - $marginX }
        $g.DrawLine($pen, [single]$marginX, $y, [single]$endX, $y)
    }

    $pen.Dispose(); $brush.Dispose(); $path.Dispose(); $g.Dispose()
    $bitmaps += $bmp
}

# Serialize multi-size ICO manually (System.Drawing.Icon can't write multi-image
# ICO files easily on Windows PowerShell 5.1).
$outDir = Split-Path $Out -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$ms = New-Object System.IO.MemoryStream

# Reserved=0, Type=1 (ICO), Count
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$bitmaps.Count)

$pngs = @()
foreach ($b in $bitmaps) {
    $pngMs = New-Object System.IO.MemoryStream
    $b.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngs += , $pngMs.ToArray()
    $pngMs.Dispose()
}

$headerSize = 6
$dirEntrySize = 16
$offset = $headerSize + ($dirEntrySize * $bitmaps.Count)
for ($i = 0; $i -lt $bitmaps.Count; $i++) {
    $b = $bitmaps[$i]
    $bytes = $pngs[$i]
    $w = if ($b.Width -ge 256) { 0 } else { $b.Width }
    $h = if ($b.Height -ge 256) { 0 } else { $b.Height }
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0)                # color count
    $bw.Write([byte]0)                # reserved
    $bw.Write([uint16]1)              # planes
    $bw.Write([uint16]32)             # bpp
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)
    $offset += $bytes.Length
}
foreach ($p in $pngs) { $bw.Write($p) }
$bw.Flush()
[System.IO.File]::WriteAllBytes($Out, $ms.ToArray())
$ms.Dispose()
foreach ($b in $bitmaps) { $b.Dispose() }
Write-Output ("wrote " + $Out + " (" + (Get-Item $Out).Length + " bytes)")
