import { type Server } from "node:http";
export declare function serveCommand(port: number): Promise<Server | null>;
