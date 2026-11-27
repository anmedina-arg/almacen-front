/**
 * Candado e idempotencia del envío del pedido (#193).
 *
 * Problema: tras "Confirmar", el modal se cierra pero el carrito sigue lleno
 * hasta que el servidor responde, así que se podía reenviar el mismo pedido y
 * crear dos órdenes idénticas. Dos defensas, una acá y otra en la base:
 *
 * - Candado: mientras hay un envío en vuelo, `begin()` devuelve `null` y el
 *   caller no manda nada. Es síncrono (no depende de un re-render de React).
 * - Clave de idempotencia: cada intento lleva un UUID que `create_order()`
 *   usa para no crear un segundo pedido si el mismo intento llega dos veces
 *   (por ejemplo un reintento automático del navegador, que ningún candado en
 *   JS ve). La clave se conserva mientras el intento no termine bien, el
 *   carrito sea el mismo y no haya pasado el tiempo de vida de la clave, así
 *   reintentar tras un error no duplica; se renueva cuando el pedido se creó,
 *   cuando el carrito cambió o cuando la clave envejeció.
 *
 * La firma del carrito (qué es "el mismo carrito") la decide el caller. Si
 * cambian precios, notas o el texto del mensaje pero no los productos y
 * cantidades, la clave se reusa: es a propósito, un reintento del mismo pedido
 * no debe volverse otro.
 */

/** Tope de espera del candado: si un envío nunca termina, no bloquea para siempre. */
export const SUBMIT_LOCK_TIMEOUT_MS = 20_000;

/**
 * Vida máxima de una clave. Pasado ese tiempo, un mismo carrito es un pedido
 * nuevo y no se debe contestar con uno viejo. Coincide con la ventana de 10
 * minutos de add_order_item_variedades().
 */
export const IDEMPOTENCY_KEY_TTL_MS = 10 * 60_000;

/** UUID v4. `crypto.randomUUID` falta en Safari viejo y en contextos no seguros. */
export function generateIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

/** Un intento de envío en curso. Sus resultados solo cuentan mientras sea el intento vigente. */
export interface SubmitAttempt {
  /** Clave de idempotencia a mandar en este envío. */
  key: string;
  /** El pedido se creó: libera el candado y descarta la clave. */
  succeeded(): void;
  /** El envío falló: libera el candado y conserva la clave para reintentar. */
  failed(): void;
}

export interface OrderSubmitGuard {
  /**
   * Intenta tomar el candado para enviar un pedido con este contenido
   * (`signature` identifica el carrito). Devuelve el intento, o `null` si ya
   * hay un envío en vuelo.
   */
  begin(signature: string): SubmitAttempt | null;
}

export function createOrderSubmitGuard(
  options: { newKey?: () => string; now?: () => number; lockTimeoutMs?: number; keyTtlMs?: number } = {}
): OrderSubmitGuard {
  const newKey = options.newKey ?? generateIdempotencyKey;
  const now = options.now ?? Date.now;
  const lockTimeoutMs = options.lockTimeoutMs ?? SUBMIT_LOCK_TIMEOUT_MS;
  const keyTtlMs = options.keyTtlMs ?? IDEMPOTENCY_KEY_TTL_MS;

  let lockedAt: number | null = null;
  let currentAttempt = 0;
  let key: string | null = null;
  let keyCreatedAt = 0;
  let signature: string | null = null;

  return {
    begin(nextSignature) {
      if (lockedAt !== null && now() - lockedAt < lockTimeoutMs) return null;
      lockedAt = now();
      const attempt = ++currentAttempt;

      if (key === null || signature !== nextSignature || now() - keyCreatedAt >= keyTtlMs) {
        key = newKey();
        keyCreatedAt = now();
        signature = nextSignature;
      }

      // Un intento que ya fue reemplazado (el candado venció y arrancó otro) no
      // puede tocar el estado del vigente: su respuesta tardía no libera el
      // candado del segundo ni le borra la clave.
      const isCurrent = () => attempt === currentAttempt;
      return {
        key,
        succeeded() {
          if (!isCurrent()) return;
          lockedAt = null;
          key = null;
          signature = null;
        },
        failed() {
          if (!isCurrent()) return;
          lockedAt = null;
        },
      };
    },
  };
}
