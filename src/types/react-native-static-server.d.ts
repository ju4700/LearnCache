declare module 'react-native-static-server' {
  interface ServerOptions {
    localOnly?: boolean;
    keepAlive?: boolean;
  }

  class StaticServer {
    constructor(port: number, path: string, options?: ServerOptions);
    start(): Promise<string>;
    stop(): Promise<void>;
  }

  export default StaticServer;
}
