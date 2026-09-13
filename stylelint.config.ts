import type { Config } from "stylelint";

export default {
  extends: "stylelint-config-standard",
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
} satisfies Config;
