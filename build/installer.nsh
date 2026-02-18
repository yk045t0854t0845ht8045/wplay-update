!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "WinMessages.nsh"

!define WPLAY_MUI_BG "0B0D10"
!define WPLAY_MUI_PANEL "141922"
!define WPLAY_MUI_TEXT "EAF0FA"
!define WPLAY_MUI_MUTED "AAB5C5"
!define WPLAY_MUI_ACCENT "00A3FF"
!define WPLAY_MUI_LINK "82C7FF"

!define MUI_BGCOLOR "${WPLAY_MUI_BG}"
!define MUI_TEXTCOLOR "${WPLAY_MUI_TEXT}"
!define MUI_HEADER_TRANSPARENT_TEXT
!define MUI_INSTFILESPAGE_COLORS "${WPLAY_MUI_TEXT} ${WPLAY_MUI_BG}"
!define MUI_FINISHPAGE_LINK_COLOR "${WPLAY_MUI_LINK}"
!define MUI_DIRECTORYPAGE_BGCOLOR "${WPLAY_MUI_BG}"
!define MUI_DIRECTORYPAGE_TEXTCOLOR "${WPLAY_MUI_TEXT}"
!define MUI_STARTMENUPAGE_BGCOLOR "${WPLAY_MUI_BG}"
!define MUI_STARTMENUPAGE_TEXTCOLOR "${WPLAY_MUI_TEXT}"
!define MUI_LICENSEPAGE_BGCOLOR "${WPLAY_MUI_BG}"

!ifndef BUILD_UNINSTALLER
Var /GLOBAL WPLAY_INSTALL_DIR_INPUT
Var /GLOBAL WPLAY_INSTALL_BROWSE_BUTTON
Var /GLOBAL WPLAY_CHECKBOX_DESKTOP
Var /GLOBAL WPLAY_CHECKBOX_STARTMENU
Var /GLOBAL WPLAY_CHECKBOX_STARTUP
Var /GLOBAL WPLAY_FINISH_RUN_CHECKBOX

Var /GLOBAL WPLAY_ENABLE_DESKTOP_SHORTCUT
Var /GLOBAL WPLAY_ENABLE_STARTMENU_SHORTCUT
Var /GLOBAL WPLAY_ENABLE_STARTUP
Var /GLOBAL WPLAY_ENABLE_RUN_AFTER_FINISH
!endif

!define MUI_CUSTOMFUNCTION_GUIINIT ApplyCustomInstallerFrame

Function ApplyCustomInstallerFrame
  System::Call 'dwmapi::DwmSetWindowAttribute(p$HWNDPARENT, i20, *i1, i4)i.r0'
  IntCmp $0 0 +2
  System::Call 'dwmapi::DwmSetWindowAttribute(p$HWNDPARENT, i19, *i1, i4)'

  !ifndef BUILD_UNINSTALLER
  StrCpy $WPLAY_ENABLE_DESKTOP_SHORTCUT "1"
  StrCpy $WPLAY_ENABLE_STARTMENU_SHORTCUT "1"
  StrCpy $WPLAY_ENABLE_STARTUP "0"
  StrCpy $WPLAY_ENABLE_RUN_AFTER_FINISH "1"
  !endif
FunctionEnd

!ifndef BUILD_UNINSTALLER

!include "StrContains.nsh"

!macro customWelcomePage
  Page custom WPlayCustomInstallPageCreate WPlayCustomInstallPageLeave
!macroend

Function WPlayCustomInstallPageCreate
  ${If} ${Silent}
    Abort
  ${EndIf}

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0u 2u 100% 12u "Instalador WPlay"
  Pop $1
  SetCtlColors $1 "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_BG}"

  ${NSD_CreateLabel} 0u 16u 100% 18u "Interface 100% personalizada. Configure e clique em Instalar."
  Pop $1
  SetCtlColors $1 "${WPLAY_MUI_MUTED}" "${WPLAY_MUI_BG}"

  ${NSD_CreateLabel} 0u 40u 100% 10u "Pasta de instalacao"
  Pop $1
  SetCtlColors $1 "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_BG}"

  ${NSD_CreateText} 0u 52u 78% 14u "$INSTDIR"
  Pop $WPLAY_INSTALL_DIR_INPUT
  SetCtlColors $WPLAY_INSTALL_DIR_INPUT "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_PANEL}"

  ${NSD_CreateButton} 80% 52u 20% 14u "Escolher..."
  Pop $WPLAY_INSTALL_BROWSE_BUTTON
  ${NSD_OnClick} $WPLAY_INSTALL_BROWSE_BUTTON WPlayOnBrowseInstallDirectory
  SetCtlColors $WPLAY_INSTALL_BROWSE_BUTTON "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_PANEL}"

  ${NSD_CreateCheckbox} 0u 76u 100% 12u "Criar atalho na Area de Trabalho"
  Pop $WPLAY_CHECKBOX_DESKTOP
  ${NSD_SetState} $WPLAY_CHECKBOX_DESKTOP ${BST_CHECKED}
  SetCtlColors $WPLAY_CHECKBOX_DESKTOP "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_BG}"

  ${NSD_CreateCheckbox} 0u 92u 100% 12u "Criar atalho no Menu Iniciar"
  Pop $WPLAY_CHECKBOX_STARTMENU
  ${NSD_SetState} $WPLAY_CHECKBOX_STARTMENU ${BST_CHECKED}
  SetCtlColors $WPLAY_CHECKBOX_STARTMENU "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_BG}"

  ${NSD_CreateCheckbox} 0u 108u 100% 12u "Iniciar junto com o PC"
  Pop $WPLAY_CHECKBOX_STARTUP
  SetCtlColors $WPLAY_CHECKBOX_STARTUP "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_BG}"

  ${NSD_CreateCheckbox} 0u 124u 100% 12u "Executar WPlay ao concluir"
  Pop $WPLAY_FINISH_RUN_CHECKBOX
  ${NSD_SetState} $WPLAY_FINISH_RUN_CHECKBOX ${BST_CHECKED}
  SetCtlColors $WPLAY_FINISH_RUN_CHECKBOX "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_BG}"

  ${NSD_CreateLabel} 0u 146u 100% 18u "Se selecionar um disco (ex: D:\), o instalador cria automaticamente a pasta do WPlay."
  Pop $1
  SetCtlColors $1 "${WPLAY_MUI_MUTED}" "${WPLAY_MUI_BG}"

  GetDlgItem $1 $HWNDPARENT 3
  ShowWindow $1 ${SW_HIDE}

  GetDlgItem $1 $HWNDPARENT 1
  SendMessage $1 ${WM_SETTEXT} 0 "STR:Instalar"

  nsDialogs::Show
FunctionEnd

Function WPlayOnBrowseInstallDirectory
  ${NSD_GetText} $WPLAY_INSTALL_DIR_INPUT $0
  nsDialogs::SelectFolderDialog "Escolha a pasta base para instalar o WPlay" "$0"
  Pop $1
  ${If} $1 == error
    Return
  ${EndIf}
  ${If} $1 == ""
    Return
  ${EndIf}
  ${NSD_SetText} $WPLAY_INSTALL_DIR_INPUT "$1"
FunctionEnd

Function WPlayCustomInstallPageLeave
  ${If} ${Silent}
    Return
  ${EndIf}

  ${NSD_GetText} $WPLAY_INSTALL_DIR_INPUT $0
  StrCpy $0 "$0"

  ${If} $0 == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "Escolha uma pasta para instalar o WPlay."
    Abort
  ${EndIf}

  StrLen $1 $0
  ${If} $1 == 2
    StrCpy $2 $0 1 1
    ${If} $2 == ":"
      StrCpy $0 "$0\"
    ${EndIf}
  ${EndIf}

  ${StrContains} $1 "${APP_FILENAME}" $0
  ${If} $1 == ""
    StrCpy $2 $0 1 -1
    ${If} $2 == "\"
      StrCpy $0 "$0${APP_FILENAME}"
    ${Else}
      StrCpy $0 "$0\${APP_FILENAME}"
    ${EndIf}
  ${EndIf}
  StrCpy $INSTDIR "$0"

  ${NSD_GetState} $WPLAY_CHECKBOX_DESKTOP $1
  ${If} $1 == ${BST_CHECKED}
    StrCpy $WPLAY_ENABLE_DESKTOP_SHORTCUT "1"
  ${Else}
    StrCpy $WPLAY_ENABLE_DESKTOP_SHORTCUT "0"
  ${EndIf}

  ${NSD_GetState} $WPLAY_CHECKBOX_STARTMENU $1
  ${If} $1 == ${BST_CHECKED}
    StrCpy $WPLAY_ENABLE_STARTMENU_SHORTCUT "1"
  ${Else}
    StrCpy $WPLAY_ENABLE_STARTMENU_SHORTCUT "0"
  ${EndIf}

  ${NSD_GetState} $WPLAY_CHECKBOX_STARTUP $1
  ${If} $1 == ${BST_CHECKED}
    StrCpy $WPLAY_ENABLE_STARTUP "1"
  ${Else}
    StrCpy $WPLAY_ENABLE_STARTUP "0"
  ${EndIf}

  ${NSD_GetState} $WPLAY_FINISH_RUN_CHECKBOX $1
  ${If} $1 == ${BST_CHECKED}
    StrCpy $WPLAY_ENABLE_RUN_AFTER_FINISH "1"
  ${Else}
    StrCpy $WPLAY_ENABLE_RUN_AFTER_FINISH "0"
  ${EndIf}
FunctionEnd

!macro customInstall
  ${If} $WPLAY_ENABLE_DESKTOP_SHORTCUT == "0"
    WinShell::UninstShortcut "$newDesktopLink"
    Delete "$newDesktopLink"
  ${EndIf}

  ${If} $WPLAY_ENABLE_STARTMENU_SHORTCUT == "0"
    WinShell::UninstShortcut "$newStartMenuLink"
    Delete "$newStartMenuLink"
  ${EndIf}

  ${If} $WPLAY_ENABLE_STARTUP == "1"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "WPlay" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  ${Else}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "WPlay"
  ${EndIf}
!macroend

!macro customFinishPage
  Page custom WPlayCustomFinishPageCreate WPlayCustomFinishPageLeave
!macroend

Function WPlayCustomFinishPageCreate
  ${If} ${Silent}
    Abort
  ${EndIf}

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0u 4u 100% 14u "Tudo pronto."
  Pop $1
  SetCtlColors $1 "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_BG}"

  ${NSD_CreateLabel} 0u 20u 100% 24u "O WPlay foi instalado em:$\r$\n$INSTDIR"
  Pop $1
  SetCtlColors $1 "${WPLAY_MUI_MUTED}" "${WPLAY_MUI_BG}"

  ${NSD_CreateCheckbox} 0u 50u 100% 12u "Executar WPlay agora"
  Pop $WPLAY_FINISH_RUN_CHECKBOX
  ${If} $WPLAY_ENABLE_RUN_AFTER_FINISH == "1"
    ${NSD_SetState} $WPLAY_FINISH_RUN_CHECKBOX ${BST_CHECKED}
  ${EndIf}
  SetCtlColors $WPLAY_FINISH_RUN_CHECKBOX "${WPLAY_MUI_TEXT}" "${WPLAY_MUI_BG}"

  ${NSD_CreateLabel} 0u 72u 100% 22u "Se precisar mudar opcoes, rode o instalador novamente.$\r$\nAs configuracoes aplicadas ficam prontas no primeiro boot."
  Pop $1
  SetCtlColors $1 "${WPLAY_MUI_MUTED}" "${WPLAY_MUI_BG}"

  GetDlgItem $1 $HWNDPARENT 3
  ShowWindow $1 ${SW_HIDE}

  GetDlgItem $1 $HWNDPARENT 1
  SendMessage $1 ${WM_SETTEXT} 0 "STR:Concluir"

  nsDialogs::Show
FunctionEnd

Function WPlayStartInstalledApp
  HideWindow
  ExecShell "open" "$INSTDIR\WPlay.exe"
FunctionEnd

Function WPlayCustomFinishPageLeave
  ${If} ${Silent}
    Return
  ${EndIf}

  ${NSD_GetState} $WPLAY_FINISH_RUN_CHECKBOX $0
  ${If} $0 == ${BST_CHECKED}
    Call WPlayStartInstalledApp
  ${EndIf}
FunctionEnd

!endif

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "WPlay"
!macroend
