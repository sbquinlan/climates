import {
  ViteDevServer,
  Plugin,
  UserConfig,
  ServerOptions,
  PreviewOptions,
  ConfigEnv,
  ProxyOptions,
} from "vite";
import { ChildProcess, spawn } from "child_process";
import { AddressInfo } from "net";

export interface CFPluginConfig {
  worker_dir: string;
  proxy_config: (mode: "development" | "preview") => Record<string, string | ProxyOptions>
}

function configureServer<TConfigType extends ServerOptions | PreviewOptions>(
  mode: ("development" | "preview"), 
  config: TConfigType,
  { proxy_config }: CFPluginConfig,
): TConfigType {
  return {
    ...config,
    // proxy data calls to the worker
    proxy: {
      ...config?.proxy,
      ...proxy_config(mode),
    },
  };
}

// Obviously globals suck, but Vite doesn't give you an option to have
// state in your plugin so this is where it ends up rather than zombie
// child processes when a reload triggers plugin reload.
global.wrangler_process;
function maybeKillWrangler() {
  global.wrangler_process = 
    global.wrangler_process?.kill()
      ? undefined
      : global.wrangler_process;
}
function launchWrangler({ worker_dir }: CFPluginConfig, args: string[]): ChildProcess {
  return spawn("npx wrangler dev", args, {
    cwd: worker_dir,
    stdio: "inherit",
    env: { ...process.env },
    shell: true,
  }).on("exit", () => {
    global.wrangler_process = null;
  });
}

export default function runCFWorker(plugin_config: CFPluginConfig): Plugin {
  return {
    name: "vite-plugin-CFWorker",
    apply: "serve",

    async config(config: UserConfig, { mode }: ConfigEnv): Promise<UserConfig> {
      if (mode === "development") {
        config.server = configureServer(mode, config.server ?? {}, plugin_config);
      } else if (mode === "preview") {
        config.preview = configureServer(mode, config.preview ?? {}, plugin_config);
      }
      return config;
    },

    async configureServer(server: ViteDevServer): Promise<() => void> {
      process.on('exit', maybeKillWrangler)
      server.httpServer?.once("listening", () => {
        maybeKillWrangler();
        
        const { address, port } = server.httpServer?.address() as AddressInfo;
        const proto = server.config.server.https ? "https" : "http";
        const upstream_host = `${proto}://${address}:${port}`;
        global.wrangler_process = launchWrangler(
          plugin_config,
          [
            "--local", // use miniflare, not prod
            "--local-upstream",  upstream_host, // use this dev server as upstream
          ]
        );
      });

      return () => {};
    },

    async configurePreviewServer(): Promise<() => void> {
      process.on('exit', maybeKillWrangler)
      return () => {
        maybeKillWrangler();
        global.wrangler_process = launchWrangler(plugin_config, []);
      }
    },
  };
}
