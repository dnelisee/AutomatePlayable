Add-Type -AssemblyName System.Drawing

function Get-Base64Resized($path) {
    $img = [System.Drawing.Image]::FromFile($path)
    $bmp = new-object System.Drawing.Bitmap 128, 128
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, 128, 128)
    $ms = new-object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $b64 = [Convert]::ToBase64String($bytes)
    $img.Dispose()
    $bmp.Dispose()
    $g.Dispose()
    $ms.Dispose()
    return "data:image/png;base64,$b64"
}

$dir = "C:\Users\orean\.gemini\antigravity\brain\b75fe395-53bd-4313-ba39-45c53f643e08"
$orc = Get-Base64Resized "$dir\orc_character_1777144580097.png"
$skeleton = Get-Base64Resized "$dir\skeleton_character_1777144599576.png"
$cyclops = Get-Base64Resized "$dir\cyclops_character_1777144613193.png"
$tomb = Get-Base64Resized "$dir\tombstone_1777144630021.png"

$htmlPath = "c:\Users\orean\OneDrive\Documents\hackaton\AutomatePlayable\Playables ads\playable5.html"
$html = [System.IO.File]::ReadAllText($htmlPath)

$html = $html.Replace('const IMG_ORC = "data:image/png;base64,";      /* BASE64_DATA_HERE */', "const IMG_ORC = `"$orc`";")
$html = $html.Replace('const IMG_SKELETON = "data:image/png;base64,"; /* BASE64_DATA_HERE */', "const IMG_SKELETON = `"$skeleton`";")
$html = $html.Replace('const IMG_CYCLOPS = "data:image/png;base64,";  /* BASE64_DATA_HERE */', "const IMG_CYCLOPS = `"$cyclops`";")
$html = $html.Replace('const IMG_TOMB = "data:image/png;base64,";     /* BASE64_DATA_HERE */', "const IMG_TOMB = `"$tomb`";")

[System.IO.File]::WriteAllText($htmlPath, $html)

Write-Host "Assets injected successfully."
