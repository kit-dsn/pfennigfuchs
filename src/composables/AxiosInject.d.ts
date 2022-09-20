import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    pf_retry?: boolean;
  }
}
