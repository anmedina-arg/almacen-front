# Historial técnico: Flujo WhatsApp + Creación de Orden en iOS

## Resumen del problema

Cuando un cliente confirma un pedido desde el catálogo público, el sistema necesita hacer dos cosas al mismo tiempo:

1. **Abrir WhatsApp** con el mensaje del pedido (crítico para el cliente)
2. **Crear la orden en la DB** vía `POST /api/orders` (crítico para el admin)

En iOS Safari estos dos objetivos entran en conflicto directo con el modelo de seguridad del browser.

---

## Restricción central de iOS Safari

iOS Safari bloquea `window.open()` a menos que sea llamado **síncronamente** dentro del handler de un gesto del usuario (tap). En cuanto hay un `await` previo, el popup blocker actúa y `window.open()` retorna `null` silenciosamente — WhatsApp no se abre.

Esto significa que **no se puede `await` nada antes de `openWhatsApp()`**.

---

## Evolución de los intentos (historial de commits)

### Fase 1 — `await` primero, luego WhatsApp (commit `a49fcd9`, 9 Feb 2026)

```typescript
const handleConfirmOrder = async () => {
  await orderService.createOrder({ ... }); // ← await consume el user gesture
  openWhatsApp(whatsAppMessage);           // ← iOS bloqueaba esto
  clearCart();
};
```

**Resultado**: Roto en iOS. El `await` antes de `window.open()` activa el popup blocker. WhatsApp no abría.

---

### Fase 2 — Ventana en blanco abierta sync, redirect posterior (commit `d4ed7bb`, 10 Feb 2026)

Intento de workaround: abrir `about:blank` síncronamente (para preservar el user gesture), hacer el `await`, y luego redirigir esa ventana ya abierta.

```typescript
const handleConfirmOrder = async () => {
  const whatsappWindow = window.open('about:blank', '_blank'); // sync ✓
  await orderService.createOrder({ ... });
  if (whatsappWindow) {
    whatsappWindow.location.href = whatsappUrl; // ← iOS bloqueaba esto
  } else {
    window.location.href = whatsappUrl; // fallback
  }
};
```

**Resultado**: **Probado en iPhone, falló.** iOS bloquea el redirect de una ventana ya abierta si ocurre después de un `await`. La restricción aplica no solo a `window.open()` sino también a cualquier navegación post-async en ventanas popup.

---

### Fase 3 — Fire-and-forget (commit `79fa553`, 10 Feb 2026)

Tras confirmar en dispositivo físico que el redirect post-async no funciona, se adoptó el patrón fire-and-forget: abrir WhatsApp primero (garantizado), crear la orden en background sin `await`.

```typescript
const handleConfirmOrder = () => {
  openWhatsApp(whatsAppMessage); // sync, antes de todo ✓

  setShowConfirmation(false);
  clearCart();

  orderService
    .createOrder({ ... })  // fire-and-forget, sin await
    .catch((error) => {
      console.error('Error creating order in background:', error);
    });
};
```

**Resultado**: WhatsApp abría correctamente en iOS. Pero la creación de la orden era frágil: si iOS backgroundeaba Safari inmediatamente después del switch a WhatsApp, el fetch podía abortarse antes de completarse. Error silencioso, sin feedback al cliente.

---

### Fase 4 — `setTimeout(0)` alrededor de los state changes (commit `30dd314`, 10 Feb 2026)

Intento de diferir los cambios de estado para no interferir con `window.open()`.

```typescript
const handleConfirmOrder = () => {
  openWhatsApp(whatsAppMessage);
  setTimeout(() => {
    setShowConfirmation(false);
    clearCart();
    orderService.createOrder({ ... }).catch(...);
  }, 0);
};
```

**Resultado**: Revertido al día siguiente. No aportaba nada sobre la Fase 3 y añadía complejidad innecesaria.

---

### Fase 5 — Revert a fire-and-forget (commit `2a4b27b`, 10 Feb 2026)

Vuelta al patrón de Fase 3. Este fue el estado estable durante ~1 mes.

---

### Fase 6 — Migración a hook `useOrderSubmit` (commit `f4d40b5`, 10 Mar 2026)

Durante la refactorización de arquitectura (SSR + Screaming Architecture), la lógica se extrajo de `ProductListContainer` al hook `useOrderSubmit`. La lógica de fondo era idéntica a Fase 3.

```typescript
// src/features/catalog/hooks/useOrderSubmit.ts
const handleConfirmOrder = (clearCart: () => void) => {
  openWhatsApp(whatsAppMessage);

  setShowConfirmation(false);
  clearCart();

  orderService
    .createOrder({ ... })
    .then(() => { router.refresh(); })
    .catch((error) => { console.error('Error creating order in background:', error); });
};
```

**Estado**: Funcional para abrir WhatsApp, pero el bug de orden no creada en iOS persistía silenciosamente.

---

### Fase 7 — Fix definitivo: fetch antes de `window.open` + `keepalive` (commit `0df4701`, 13 Mar 2026)

Dos cambios combinados que atacan la raíz del problema:

**`useOrderSubmit.ts`** — Iniciar el fetch ANTES de abrir WhatsApp:

```typescript
const handleConfirmOrder = (clearCart: () => void) => {
  const items = cartItems.map((item) => ({ ... })); // snapshot antes de cualquier cambio de estado
  const message = whatsAppMessage;

  // El fetch se inicia AQUÍ — ya está en vuelo antes de que iOS switchee a WhatsApp
  const orderPromise = orderService.createOrder({ whatsapp_message: message, items });

  // window.open sigue siendo síncrono desde el user gesture — popup blocker no actúa
  openWhatsApp(message);

  setShowConfirmation(false);
  clearCart();

  orderPromise
    .then(() => { router.refresh(); })
    .catch((error) => { console.error('Error creating order in background:', error); });
};
```

**`orderService.ts`** — `keepalive: true` en el fetch:

```typescript
const res = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
  keepalive: true, // ← el browser mantiene el request vivo aunque Safari pase a background
});
```

**Por qué funciona**:

- `fetch()` no consume el "user gesture token" de iOS — solo lo consumen APIs que muestran UI al usuario (`window.open`, audio/video, clipboard). Un request de red es transparente para el modelo de seguridad.
- Al iniciar el fetch antes de `window.open()`, el request ya está en tránsito cuando iOS backgroundea Safari.
- `keepalive: true` garantiza que el browser complete el request aunque el tab esté en background o la página se descargue.

---

## Tabla resumen

| Fase | Enfoque | iOS WhatsApp | Orden en DB | Estado |
|------|---------|:---:|:---:|--------|
| 1 | `await` → `openWhatsApp` | ❌ | ✅ | Roto en iOS |
| 2 | `window.open('about:blank')` → `await` → redirect | ❌ | ✅ | Probado en iPhone, falló |
| 3–6 | `openWhatsApp` → fire-and-forget | ✅ | ⚠️ | WA abre, orden puede perderse |
| **7** | **fetch iniciado → `openWhatsApp` → `keepalive`** | **✅** | **✅** | **Fix actual** |

---

## Archivos clave

| Archivo | Responsabilidad |
|---------|----------------|
| `src/features/catalog/hooks/useOrderSubmit.ts` | Orquesta el flujo: fetch → openWhatsApp → clearCart |
| `src/features/catalog/utils/messageUtils.ts` | `openWhatsApp()` — construye URL y llama `window.open` |
| `src/features/admin/services/orderService.ts` | `createOrder()` — fetch con `keepalive: true` |

---

## Notas para el futuro

- **No agregar `await` antes de `openWhatsApp()`** bajo ninguna circunstancia. iOS bloqueará el popup.
- **No intentar** el patrón de "abrir ventana blank y redirigirla post-async" — fue probado en dispositivo físico y falló.
- Si en el futuro se migra a `whatsapp://send?phone=...&text=...` (deep link directo), `window.open` podría reemplazarse por `window.location.href` sin riesgo de navegación real (iOS intercepta el scheme y abre la app sin navegar el browser). Pero esto requiere que el cliente tenga WhatsApp instalado.
- `keepalive: true` tiene un límite de 64 KB de body — suficiente para cualquier pedido realista.
