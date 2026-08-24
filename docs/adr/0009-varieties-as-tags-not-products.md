# Variedades de Producto Surtido son etiquetas propias, no filas de `products`

Un Producto Surtido (ej. "Helado 1/4kg") se arma eligiendo Variedades (ej. sabores) de su
Familia. El patrón existente para composición de productos, Combos (`combo_components`),
vincula `products` a `products` porque ahí cada componente sí tiene precio y stock propios
que importan al cálculo. Acá no: una Variedad nunca se vende suelta, no tiene precio ni
stock individual (decidido explícitamente fuera de alcance para v1), y el mecanismo tiene
que ser genérico (helado, masas, y lo que venga), no atado a que cada opción sea un producto
completo del catálogo.

Se decidió modelar las Variedades en una entidad de dominio propia y liviana (Variedad,
agrupada por Familia), en vez de reusar `products` con el patrón de `combo_components`.
Alguien familiarizado con Combos podría esperar simetría acá — la razón de no seguirla es
que reusar `products` obligaría a cargar precio/stock/categoría en filas que nunca se
venden por sí solas, solo para terminar ignorando esos campos.

**Consecuencia**: si en el futuro una Variedad puntual necesita precio propio (ej. un sabor
premium con recargo) o stock individual, este modelo no lo contempla y habría que revisarlo
— no está descartado, pero no es el diseño actual.
