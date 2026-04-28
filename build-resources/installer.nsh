; Auto-install Visual C++ Redistributable if not already present
!macro customInstall
  DetailPrint "Checking Visual C++ Redistributable..."
  ; Check if VC++ 2015-2022 x64 is already installed via registry
  ReadRegDword $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != 1
    DetailPrint "Installing Visual C++ Redistributable..."
    File /oname=$PLUGINSDIR\vc_redist.x64.exe "${BUILD_RESOURCES_DIR}\vc_redist.x64.exe"
    ExecWait '"$PLUGINSDIR\vc_redist.x64.exe" /install /quiet /norestart'
    DetailPrint "Visual C++ Redistributable installed."
  ${Else}
    DetailPrint "Visual C++ Redistributable already installed."
  ${EndIf}
!macroend
