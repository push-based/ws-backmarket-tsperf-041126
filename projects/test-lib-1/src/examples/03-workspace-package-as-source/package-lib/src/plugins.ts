import type { PluginConfig } from "./types";

export interface PluginRegistry {
  register(plugin: PluginConfig): void;
  get(name: string): PluginConfig | undefined;
  list(): PluginConfig[];
}

export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, PluginConfig>();
  return {
    register(plugin) {
      plugins.set(plugin.name, plugin);
    },
    get(name) {
      return plugins.get(name);
    },
    list() {
      return Array.from(plugins.values());
    },
  };
}
