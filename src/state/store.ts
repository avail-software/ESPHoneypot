export type Listener<T> = (next: T, prev: T) => void;
export type Unsubscribe = () => void;

export class Store<T extends object> {
  private state: T;
  private listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this.state = { ...initial };
  }

  get(): Readonly<T> {
    return this.state;
  }

  set(partial: Partial<T>): void {
    const prev = this.state;
    this.state = { ...prev, ...partial };
    for (const fn of this.listeners) fn(this.state, prev);
  }

  subscribe(fn: Listener<T>): Unsubscribe {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  select<S>(
    selector: (s: T) => S,
    fn: (next: S, prev: S) => void,
  ): Unsubscribe {
    let cached = selector(this.state);
    return this.subscribe((state, prev) => {
      const next = selector(state);
      const old = selector(prev);
      if (next !== cached || next !== old) {
        const previous = cached;
        cached = next;
        fn(next, previous);
      }
    });
  }
}
