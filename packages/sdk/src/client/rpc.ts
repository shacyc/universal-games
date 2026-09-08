import { PROTOCOL_VERSION, type ErrorCode, type Request, type Response } from '../protocol.js';

/**
 * Requests issued before the handshake resolves are queued rather than
 * rejected — a game that calls `load()` on its first line is behaving
 * correctly and must not be punished for winning a race.
 */
interface Pending {
  resolve(data: unknown): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout> | undefined;
}

export class RpcTimeoutError extends Error {
  readonly code: ErrorCode = 'INTERNAL';
  constructor(method: string, ms: number) {
    super(`Host did not answer "${method}" within ${ms}ms`);
    this.name = 'RpcTimeoutError';
  }
}

export class RpcError extends Error {
  constructor(readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'RpcError';
  }
}

export class Rpc {
  #nextId = 1;
  #pending = new Map<number, Pending>();
  #queue: Request[] = [];
  #connected = false;
  #send: (request: Request) => void;

  constructor(send: (request: Request) => void) {
    this.#send = send;
  }

  /** Flush anything the game asked for before the host was reachable. */
  open(): void {
    this.#connected = true;
    const queued = this.#queue;
    this.#queue = [];
    for (const request of queued) this.#send(request);
  }

  call(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    const id = this.#nextId++;
    const request: Request = { v: PROTOCOL_VERSION, id, method, ...(params === undefined ? {} : { params }) };

    return new Promise<unknown>((resolve, reject) => {
      // A wedged host must not freeze the game on a promise that never settles.
      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              this.#pending.delete(id);
              reject(new RpcTimeoutError(method, timeoutMs));
            }, timeoutMs)
          : undefined;

      this.#pending.set(id, { resolve, reject, timer });

      if (this.#connected) this.#send(request);
      else this.#queue.push(request);
    });
  }

  receive(response: Response): void {
    const pending = this.#pending.get(response.id);
    if (!pending) return; // late reply to a timed-out call
    this.#pending.delete(response.id);
    if (pending.timer !== undefined) clearTimeout(pending.timer);

    if (response.ok) pending.resolve(response.data);
    else pending.reject(new RpcError(response.error.code, response.error.message));
  }

  /** Fail everything outstanding — the host is gone and is not coming back. */
  closeAll(reason: string): void {
    const pending = [...this.#pending.values()];
    this.#pending.clear();
    this.#queue = [];
    this.#connected = false;
    for (const p of pending) {
      if (p.timer !== undefined) clearTimeout(p.timer);
      p.reject(new RpcError('INTERNAL', reason));
    }
  }
}
