declare module '@modelcontextprotocol/sdk/dist/esm/client' {
  export class McpClient {
    constructor(options?: any);
    connect(transport: any): Promise<void>;
    callTool(name: string, params: any): Promise<any>;
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/client/websocket' {
  export class WebsocketClientTransport {
    constructor(options?: any);
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/server' {
  export class McpServer {
    constructor(options: { name: string; version: string });
    connect(transport: any): Promise<void>;
    tool(
      name: string,
      schema: any,
      handler: (params: any) => Promise<any>,
    ): void;
    resource(
      name: string,
      template: ResourceTemplate,
      handler: (uri: any, params: any) => Promise<any>,
    ): void;
  }

  export class ResourceTemplate {
    constructor(template: string, options: { list?: any });
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/stdio' {
  export class StdioServerTransport {
    constructor(options?: any);
    handleRequest(request: any): Promise<any>;
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/websocket' {
  export class WebsocketServerTransport {
    constructor(options?: any);
    handleRequest(request: any): Promise<any>;
  }
}
