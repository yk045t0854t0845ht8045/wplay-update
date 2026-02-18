const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function resolveFirstExistingPath(candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "";
}

module.exports = async function afterPack(context) {
  if (process.platform !== "win32") {
    return;
  }
  if (String(context?.electronPlatformName || "").toLowerCase() !== "win32") {
    return;
  }

  const projectDir = String(context?.packager?.projectDir || context?.projectDir || "").trim();
  const appOutDir = String(context?.appOutDir || "").trim();
  if (!projectDir || !appOutDir) {
    return;
  }

  const productFilename =
    String(context?.packager?.appInfo?.productFilename || context?.packager?.appInfo?.productName || "WPlay").trim() ||
    "WPlay";
  const exePath = path.join(appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(projectDir, "build", "icon.ico");
  const appVersion = String(context?.packager?.appInfo?.version || "").trim();
  const brandedProcessName = "WPlay Games";
  const originalFilename = path.basename(exePath);
  const internalName = path.basename(exePath, path.extname(exePath));

  if (!fs.existsSync(exePath)) {
    return;
  }
  if (!fs.existsSync(iconPath)) {
    throw new Error(`[ICON] Arquivo nao encontrado: ${iconPath}`);
  }

  const rceditPath = resolveFirstExistingPath([
    path.join(projectDir, "node_modules", "rcedit", "bin", "rcedit-x64.exe"),
    path.join(projectDir, "node_modules", "rcedit", "bin", "rcedit.exe")
  ]);

  if (!rceditPath) {
    throw new Error("[ICON] rcedit nao encontrado em node_modules/rcedit/bin.");
  }

  const args = [
    exePath,
    "--set-icon",
    iconPath,
    "--set-version-string",
    "FileDescription",
    brandedProcessName,
    "--set-version-string",
    "ProductName",
    brandedProcessName,
    "--set-version-string",
    "InternalName",
    internalName,
    "--set-version-string",
    "OriginalFilename",
    originalFilename
  ];

  if (appVersion) {
    args.push("--set-file-version", appVersion, "--set-product-version", appVersion);
  }

  const result = spawnSync(rceditPath, args, {
    windowsHide: true,
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`[ICON] rcedit falhou com codigo ${result.status}.`);
  }

  console.log(`[ICON] Executavel atualizado com icone: ${exePath}`);
};
