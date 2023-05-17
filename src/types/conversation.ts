export interface Conversation {
  emit(type: string, ...payload: any[]): any;
  on(type: string, handler: (...args: any[]) => any): any;
  write(bytes: Uint8Array): void;
  end(): void;
}
