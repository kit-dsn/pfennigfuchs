export declare global {
  interface Window {
    _pf_login: (matrixId: string, password: string, homeserver: string) => Promise<void>
  }
}
