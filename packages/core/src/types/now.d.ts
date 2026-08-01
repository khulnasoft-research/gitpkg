declare module "@now/node" {
  export interface NowRequestQuery {
    [key: string]: string | string[] | undefined;
  }
}