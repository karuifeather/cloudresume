import { defineConfig, type Plugin } from "vite";
import { loadContent } from "./scripts/load-content";

const root = new URL("./content", import.meta.url).pathname;

const virtualId = "virtual:resume-content";

// Validate YAML at build time; only the resulting data reaches the browser.
function resumeContent(): Plugin {
  return {
    name: "resume-content",
    buildStart() {
      loadContent(root);
    },
    resolveId(id) {
      if (id === virtualId) {
        return "\0" + virtualId;
      }
    },
    load(id) {
      if (id === "\0" + virtualId) {
        return `export default ${JSON.stringify(loadContent(root))}`;
      }
    },
    configureServer(server) {
      // Content edits invalidate the generated module before reloading the page.
      server.watcher.add(root);
      server.watcher.on("all", (_event, file) => {
        if (!file.startsWith(root) || !/\.ya?ml$/.test(file)) {
          return;
        }

        const mod = server.moduleGraph.getModuleById("\0" + virtualId);

        if (mod) {
          server.moduleGraph.invalidateModule(mod);
        }

        server.ws.send({ type: "full-reload" });
      });
    },
  };
}

export default defineConfig({ plugins: [resumeContent()] });
