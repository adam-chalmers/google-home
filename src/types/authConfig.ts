import GoogleAssistant from "google-assistant";

// Would be nicer if this was exported from the google-assistant lib, but we can kinda hackily extract it here anyway for easier use
export type AuthConfig = ConstructorParameters<typeof GoogleAssistant>[0];
