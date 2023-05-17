import { AuthConfig } from "./authConfig";

export interface HomeConfig extends AuthConfig {
  timeout?: number;
  logOnReady?: boolean;
}
