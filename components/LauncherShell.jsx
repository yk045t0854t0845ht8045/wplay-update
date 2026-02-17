import fs from "node:fs";
import path from "node:path";

function readShellMarkup() {
  const templatePath = path.join(process.cwd(), "components", "launcher-shell.html");
  return fs.readFileSync(templatePath, "utf8");
}

export default function LauncherShell() {
  const markup = readShellMarkup();
  return <div id="launcherShellRoot" dangerouslySetInnerHTML={{ __html: markup }} />;
}
