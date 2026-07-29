import { createEntrypointPackageLayout } from "package-layout-static";

for (const entrypoint of ["scriptc", "bin/scriptc", "dir\\scriptc"]) {
  const layout = createEntrypointPackageLayout(entrypoint, "/root", "/usr/bin:/bin");
  console.log(layout.packageDir, layout.candidates.length);
}
