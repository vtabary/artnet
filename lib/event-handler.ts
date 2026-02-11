export interface CustomEvent<T extends string> extends Omit<
  Event,
  "detail" | "initCustomEvent"
> {
  type: T;
}

export class EventHandler<
  T extends string = string,
  U extends CustomEvent<T> = CustomEvent<T>,
> {
  private readonly listeners: Map<T, ((event: U) => void)[]> = new Map();

  public addEventListener(type: T, listener: (event: U) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(listener);
  }

  public removeEventListener(type: T, listener: (event: U) => void): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      const index = typeListeners.indexOf(listener);
      if (index > -1) {
        typeListeners.splice(index, 1);
      }
    }
  }

  public dispatchEvent(event: U): void {
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((listener) => listener(event));
    }
  }
}
