import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CardStore } from "../lib/store.js";
import { HookRegistry } from "../lib/hooks.js";
export declare function registerOperations(server: McpServer, store: CardStore, hooks: HookRegistry, home: string, getClientName: () => string): void;
