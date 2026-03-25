import { EventEmitter } from "events"
import type { DomainEvents } from "./types"

class TypedEventBus {
  private emitter = new EventEmitter()

  emit<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]): void {
    this.emitter.emit(event as string, payload)
  }

  on<K extends keyof DomainEvents>(event: K, handler: (payload: DomainEvents[K]) => void): void {
    this.emitter.on(event as string, handler)
  }

  off<K extends keyof DomainEvents>(event: K, handler: (payload: DomainEvents[K]) => void): void {
    this.emitter.off(event as string, handler)
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners()
  }
}

export const eventBus = new TypedEventBus()
export type { TypedEventBus }
