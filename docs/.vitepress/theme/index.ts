import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
// https://vitepress.dev/guide/custom-theme
import { h } from "vue";
import "./style.css";
import type { Toodle } from "@vaguevoid/toodle";

declare global {
  var TOODLE: typeof import("@vaguevoid/toodle");
  var GLOBAL_REGISTERED_TOODLES: Toodle[];
}

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    });
  },
  async enhanceApp({ app, router, siteData }) {
    if (typeof window !== "undefined") {
      const toodle = await import("@vaguevoid/toodle");
      window.TOODLE = toodle;
      window.GLOBAL_REGISTERED_TOODLES = [];

      router.onBeforeRouteChange = () => {
        for (const toods of window.GLOBAL_REGISTERED_TOODLES) {
          toods.destroy();
        }
        window.GLOBAL_REGISTERED_TOODLES = [];
      };
    }
  },
} satisfies Theme;
