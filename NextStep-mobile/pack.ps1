# Delete node_modules folders
Write-Host "Deleting node_modules folders..."
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Create a zip file of the rest of the files and folders
$source = "." # Current directory
$destination = "E:\ns-mobile.zip"

# Get all items except the node_modules directory.
$itemsToZip = Get-ChildItem -Path $source -Exclude "node_modules", "ns-mobile.zip" # Exclude the node_modules and the zip file itself.

# Check if there are any items to zip.
if ($itemsToZip) {
    try {
        # Create a temporary directory to copy all files to, as the archive method doesn't like to zip the current directory.
        $tempDir = Join-Path -Path $env:TEMP -ChildPath "TempZipFolder"
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

        # Copy all files and directories into the temporary folder.
        Copy-Item -Path $itemsToZip -Destination $tempDir -Recurse -Force -ErrorAction SilentlyContinue

        # Compress to Zip.
        Compress-Archive -Path $tempDir\* -DestinationPath $destination -Force

        # Remove the temporary directory.
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

        Write-Host "Zip file created: $destination"
    }
    catch {
        Write-Error "Failed to create zip file: $_"
    }
}
else {
    Write-Host "No files or folders found to zip (node_modules was the only folder)"
}