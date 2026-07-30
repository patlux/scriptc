import {
  applyPackageLayoutEnvironment,
  register,
} from "nullish-assignment-static";

register({}, { label: "one" });
register({}, 2);

applyPackageLayoutEnvironment({ packageDir: "/pkg" }, {});

console.log("done");
