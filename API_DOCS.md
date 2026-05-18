# Ely's Salon — API Documentation

> **Base URL**: `http://localhost:3001/v1`
> **Authentication**: Bearer token in `Authorization` header
> **Content-Type**: `application/json`
> **Language**: es-MX

---

## Tabla de Contenidos

1. [Autenticación](#1-autenticación)
2. [Staff / Usuarios](#2-staff--usuarios)
3. [Permisos](#3-permisos)
4. [Categorías](#4-categorías)
5. [Catálogo](#5-catálogo)
6. [Ventas](#6-ventas)
7. [Inventario](#7-inventario)
8. [Timeclock / Asistencia](#8-timeclock--asistencia)
9. [Metas / Bonos](#9-metas--bonos)
10. [Promociones](#10-promociones)
11. [Alertas](#11-alertas)
12. [Nómina](#12-nómina)
13. [Analíticas](#13-analíticas)
14. [Reportes](#14-reportes)
15. [Configuración](#15-configuración)
16. [Preferencias de Usuario](#16-preferencias-de-usuario)
17. [Auditoría](#17-auditoría)
18. [Eventos (WebSocket)](#18-eventos-websocket)

---

## 1. Autenticación

### 1.1 Unlock — Login con PIN

**POST** `/v1/auth/unlock`

Autentica a una usuaria usando su PIN de 4 dígitos. Retorna un JWT con la información del usuario.

**Acceso**: Público (no requiere autenticación)

**Rate Limit**: 5 intentos por 30 segundos. Tras exceder, bloqueo por 5 minutos (429).

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `pin` | `string` | Sí | PIN de 4 dígitos de la usuaria |

```json
{
  "pin": "1234"
}
```

#### Responses

**200 OK** — Autenticación exitosa

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "María García",
    "role": "admin",
    "initials": "MG",
    "color": "#FF6B6B",
    "permissions": {
      "users.read": true,
      "users.write": true,
      "tickets.create": true
    }
  }
}
```

**401 Unauthorized** — PIN inválido

```json
{
  "error": {
    "code": "INVALID_PIN",
    "message": "PIN incorrecto"
  }
}
```

**404 Not Found** — Usuario no encontrado

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "No se encontró una usuaria con ese PIN"
  }
}
```

**429 Too Many Requests** — Demasiados intentos

```json
{
  "error": {
    "code": "TOO_MANY_ATTEMPTS",
    "message": "Demasiados intentos. Intente nuevamente en 5 minutos"
  }
}
```

---

### 1.2 Lock — Cerrar sesión

**POST** `/v1/auth/lock`

Invalida el token actual y registra el evento de cierre de sesión en la auditoría.

**Acceso**: Autenticado (requiere Bearer token)

#### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer <token>` | Sí |

#### Responses

**200 OK** — Sesión cerrada exitosamente

```json
{
  "message": "Sesión cerrada correctamente"
}
```

**401 Unauthorized** — Token inválido o expirado

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token de acceso inválido o expirado"
  }
}
```

---

### 1.3 Me — Obtener perfil actual

**GET** `/v1/auth/me`

Obtiene la información completa del usuario autenticado, incluyendo permisos efectivos.

**Acceso**: Autenticado

#### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer <token>` | Sí |

#### Responses

**200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "María García",
  "role": "admin",
  "initials": "MG",
  "color": "#FF6B6B",
  "position": "Estilista Senior",
  "status": "active",
  "hireDate": "2023-01-15T00:00:00.000Z",
  "phone": "+52 555 123 4567",
  "email": "maria@elyssalon.com",
  "birthday": "1990-05-20T00:00:00.000Z",
  "payType": "commission",
  "salary": 5000,
  "commissionRate": 40,
  "avatarHue": 0,
  "permissions": {
    "users.read": true,
    "users.write": true,
    "tickets.create": true,
    "tickets.read": true,
    "inventory.read": true
  },
  "createdAt": "2023-01-15T10:00:00.000Z",
  "updatedAt": "2024-03-10T15:30:00.000Z"
}
```

**401 Unauthorized**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token de acceso inválido o expirado"
  }
}
```

---

## 2. Staff / Usuarios

### 2.1 Public Hints — Hints para lockscreen

**GET** `/v1/staff/public`

Obtiene información pública de las usuarias para mostrar en la pantalla de bloqueo (lockscreen). Solo devuelve datos no sensibles.

**Acceso**: Público

#### Responses

**200 OK**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "María García",
    "initials": "MG",
    "color": "#FF6B6B",
    "avatarHue": 0
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Ana López",
    "initials": "AL",
    "color": "#4ECDC4",
    "avatarHue": 120
  }
]
```

---

### 2.2 Listar usuarios

**GET** `/v1/staff`

Lista todas las usuarias del sistema con información completa incluyendo datos de RRHH.

**Acceso**: Requiere permiso `users.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `role` | `string` | No | Filtrar por rol: `admin`, `empleada` |
| `status` | `string` | No | Filtrar por estado: `active`, `inactive`, `vacation` |
| `search` | `string` | No | Búsqueda por nombre o email |

#### Ejemplo

```
GET /v1/staff?role=admin&status=active&search=maria
```

#### Responses

**200 OK**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "María García",
    "role": "admin",
    "initials": "MG",
    "color": "#FF6B6B",
    "position": "Estilista Senior",
    "status": "active",
    "hireDate": "2023-01-15T00:00:00.000Z",
    "phone": "+52 555 123 4567",
    "email": "maria@elyssalon.com",
    "birthday": "1990-05-20T00:00:00.000Z",
    "payType": "commission",
    "salary": 5000,
    "commissionRate": 40,
    "permissions": {
      "users.read": true,
      "users.write": true
    },
    "createdAt": "2023-01-15T10:00:00.000Z",
    "updatedAt": "2024-03-10T15:30:00.000Z"
  }
]
```

**403 Forbidden**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "No tienes permisos para ver la lista de usuarias"
  }
}
```

---

### 2.3 Crear usuario

**POST** `/v1/staff`

Crea una nueva usuaria en el sistema.

**Acceso**: Requiere permiso `users.write`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | Sí | Nombre completo (2-120 caracteres) |
| `pin` | `string` | Sí | PIN de 4 dígitos |
| `role` | `string` | Sí | Rol: `admin`, `empleada` |
| `initials` | `string` | No | Iniciales (1-4 caracteres) |
| `color` | `string` | No | Color hexadecimal para avatar |
| `position` | `string` | No | Cargo o posición |
| `status` | `string` | No | Estado: `active`, `inactive`, `vacation` |
| `hireDate` | `string` | No | Fecha de contratación (ISO 8601) |
| `phone` | `string` | No | Teléfono |
| `email` | `string` | No | Email |
| `birthday` | `string` | No | Fecha de nacimiento (ISO 8601) |
| `schedule` | `object` | No | Horario personalizado |
| `payType` | `string` | No | Tipo de pago: `salary`, `commission`, `mixed` |
| `salary` | `number` | No | Salario base |
| `commissionRate` | `number` | No | Porcentaje de comisión (0-100) |
| `avatarHue` | `number` | No | Tono de color para avatar (0-360) |

```json
{
  "name": "Ana López",
  "pin": "5678",
  "role": "empleada",
  "initials": "AL",
  "color": "#4ECDC4",
  "position": "Estilista",
  "status": "active",
  "hireDate": "2024-01-15T00:00:00.000Z",
  "phone": "+52 555 987 6543",
  "email": "ana@elyssalon.com",
  "payType": "commission",
  "salary": 3000,
  "commissionRate": 35,
  "avatarHue": 120
}
```

#### Responses

**201 Created**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Ana López",
  "role": "empleada",
  "initials": "AL",
  "color": "#4ECDC4",
  "position": "Estilista",
  "status": "active",
  "hireDate": "2024-01-15T00:00:00.000Z",
  "phone": "+52 555 987 6543",
  "email": "ana@elyssalon.com",
  "payType": "commission",
  "salary": 3000,
  "commissionRate": 35,
  "avatarHue": 120,
  "permissions": {
    "tickets.create": true,
    "tickets.read": true,
    "inventory.read": true
  },
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**400 Bad Request** — Validación fallida

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos de entrada inválidos",
    "fields": [
      {
        "field": "pin",
        "message": "PIN debe tener exactamente 4 caracteres"
      }
    ]
  }
}
```

**403 Forbidden**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "No tienes permisos para crear usuarias"
  }
}
```

---

### 2.4 Obtener usuario por ID

**GET** `/v1/staff/:id`

Obtiene la información detallada de una usuaria específica.

**Acceso**: Requiere permiso `users.read`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la usuaria |

#### Responses

**200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "María García",
  "role": "admin",
  "initials": "MG",
  "color": "#FF6B6B",
  "position": "Estilista Senior",
  "status": "active",
  "hireDate": "2023-01-15T00:00:00.000Z",
  "phone": "+52 555 123 4567",
  "email": "maria@elyssalon.com",
  "birthday": "1990-05-20T00:00:00.000Z",
  "payType": "commission",
  "salary": 5000,
  "commissionRate": 40,
  "avatarHue": 0,
  "permissions": {},
  "createdAt": "2023-01-15T10:00:00.000Z",
  "updatedAt": "2024-03-10T15:30:00.000Z"
}
```

**404 Not Found**

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Usuaria no encontrada"
  }
}
```

---

### 2.5 Actualizar usuario

**PATCH** `/v1/staff/:id`

Actualiza la información de una usuaria existente. Solo los campos proporcionados serán actualizados.

**Acceso**: Requiere permiso `users.write`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la usuaria |

#### Request Body (todos opcionales)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | `string` | Nombre completo |
| `role` | `string` | Rol: `admin`, `empleada` |
| `initials` | `string` | Iniciales |
| `color` | `string` | Color hexadecimal |
| `position` | `string` | Cargo |
| `status` | `string` | Estado |
| `hireDate` | `string` | Fecha de contratación |
| `phone` | `string` | Teléfono |
| `email` | `string` | Email |
| `birthday` | `string` | Fecha de nacimiento |
| `schedule` | `object` | Horario |
| `payType` | `string` | Tipo de pago |
| `salary` | `number` | Salario base |
| `commissionRate` | `number` | Porcentaje de comisión |
| `avatarHue` | `number` | Tono de avatar |

```json
{
  "position": "Estilista Senior",
  "commissionRate": 45,
  "salary": 5500
}
```

#### Responses

**200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "María García",
  "role": "admin",
  "position": "Estilista Senior",
  "commissionRate": 45,
  "salary": 5500,
  "updatedAt": "2024-03-15T10:00:00.000Z"
}
```

**404 Not Found**

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Usuaria no encontrada"
  }
}
```

---

### 2.6 Cambiar PIN de usuario

**PATCH** `/v1/staff/:id/pin`

Cambia el PIN de acceso de una usuaria.

**Acceso**: Requiere permiso `users.write`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la usuaria |

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `pin` | `string` | Sí | Nuevo PIN de 4 dígitos |

```json
{
  "pin": "9999"
}
```

#### Responses

**200 OK**

```json
{
  "message": "PIN actualizado correctamente",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**400 Bad Request**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "PIN debe tener exactamente 4 caracteres"
  }
}
```

---

### 2.7 Eliminar usuario (soft delete)

**DELETE** `/v1/staff/:id`

Elimina lógicamente una usuaria del sistema (soft delete). La usuaria no podrá iniciar sesión pero sus registros históricos se mantienen.

**Acceso**: Requiere permiso `users.delete`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la usuaria |

#### Responses

**200 OK**

```json
{
  "message": "Usuaria eliminada correctamente",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**404 Not Found**

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Usuaria no encontrada"
  }
}
```

---

### 2.8 Actualizar permisos de usuario

**PATCH** `/v1/staff/:id/permissions`

Sobreescribe los permisos por defecto del rol de una usuaria específica.

**Acceso**: Requiere permiso `users.permissions.manage`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la usuaria |

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `role` | `string` | No | Nuevo rol: `admin`, `empleada` |
| `permissions` | `object` | Sí | Objeto con permisos individuales |

```json
{
  "role": "admin",
  "permissions": {
    "users.read": true,
    "users.write": true,
    "tickets.create": true,
    "inventory.adjust": true
  }
}
```

#### Responses

**200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "admin",
  "permissions": {
    "users.read": true,
    "users.write": true,
    "tickets.create": true,
    "inventory.adjust": true
  },
  "updatedAt": "2024-03-15T10:00:00.000Z"
}
```

---

## 3. Permisos

### 3.1 Obtener matriz de permisos

**GET** `/v1/permissions`

Obtiene la matriz global de permisos que define los permisos por defecto para los roles `admin` y `empleada`.

**Acceso**: Requiere permiso `users.permissions.manage`

#### Responses

**200 OK**

```json
{
  "rows": [
    {
      "perm": "users.read",
      "admin": true,
      "empleada": false
    },
    {
      "perm": "users.write",
      "admin": true,
      "empleada": false
    },
    {
      "perm": "tickets.create",
      "admin": true,
      "empleada": true
    },
    {
      "perm": "tickets.read",
      "admin": true,
      "empleada": true
    },
    {
      "perm": "inventory.read",
      "admin": true,
      "empleada": true
    },
    {
      "perm": "inventory.adjust",
      "admin": true,
      "empleada": false
    }
  ]
}
```

---

### 3.2 Actualizar matriz de permisos

**PUT** `/v1/permissions`

Reemplaza completamente la matriz global de permisos.

**Acceso**: Requiere permiso `users.permissions.manage`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `rows` | `array` | Sí | Array de filas de permisos |
| `rows[].perm` | `string` | Sí | Nombre del permiso |
| `rows[].admin` | `boolean` | Sí | Permiso para rol admin |
| `rows[].empleada` | `boolean` | Sí | Permiso para rol empleada |

```json
{
  "rows": [
    {
      "perm": "users.read",
      "admin": true,
      "empleada": true
    },
    {
      "perm": "users.write",
      "admin": true,
      "empleada": false
    },
    {
      "perm": "tickets.create",
      "admin": true,
      "empleada": true
    }
  ]
}
```

#### Responses

**200 OK**

```json
{
  "message": "Matriz de permisos actualizada correctamente",
  "rows": [
    {
      "perm": "users.read",
      "admin": true,
      "empleada": true
    },
    {
      "perm": "users.write",
      "admin": true,
      "empleada": false
    }
  ]
}
```

---

## 4. Categorías

### 4.1 Listar categorías

**GET** `/v1/categories`

Obtiene todas las categorías de servicios/productos del catálogo.

**Acceso**: Autenticado

#### Responses

**200 OK**

```json
[
  {
    "id": "110e8400-e29b-41d4-a716-446655440000",
    "label": "Corte de Cabello",
    "ordering": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "220e8400-e29b-41d4-a716-446655440001",
    "label": "Coloración",
    "ordering": 2,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "330e8400-e29b-41d4-a716-446655440002",
    "label": "Productos",
    "ordering": 3,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 4.2 Crear categoría

**POST** `/v1/categories`

Crea una nueva categoría para el catálogo.

**Acceso**: Requiere permiso `categories.write`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `label` | `string` | Sí | Nombre de la categoría |
| `ordering` | `number` | No | Orden de visualización |

```json
{
  "label": "Tratamientos Capilares",
  "ordering": 4
}
```

#### Responses

**201 Created**

```json
{
  "id": "440e8400-e29b-41d4-a716-446655440003",
  "label": "Tratamientos Capilares",
  "ordering": 4,
  "createdAt": "2024-03-15T10:00:00.000Z",
  "updatedAt": "2024-03-15T10:00:00.000Z"
}
```

---

### 4.3 Actualizar categoría

**PATCH** `/v1/categories/:id`

Actualiza una categoría existente.

**Acceso**: Requiere permiso `categories.write`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la categoría |

#### Request Body

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `label` | `string` | Nombre de la categoría |
| `ordering` | `number` | Orden de visualización |

```json
{
  "label": "Tratamientos Especiales",
  "ordering": 5
}
```

#### Responses

**200 OK**

```json
{
  "id": "440e8400-e29b-41d4-a716-446655440003",
  "label": "Tratamientos Especiales",
  "ordering": 5,
  "updatedAt": "2024-03-15T12:00:00.000Z"
}
```

---

### 4.4 Eliminar categoría

**DELETE** `/v1/categories/:id`

Elimina una categoría del sistema.

**Acceso**: Requiere permiso `categories.write`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la categoría |

#### Responses

**200 OK**

```json
{
  "message": "Categoría eliminada correctamente",
  "id": "440e8400-e29b-41d4-a716-446655440003"
}
```

**404 Not Found**

```json
{
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Categoría no encontrada"
  }
}
```

---

## 5. Catálogo

### 5.1 Listar items del catálogo

**GET** `/v1/catalog`

Obtiene los items del catálogo. Puede filtrarse por tipo, categoría o estado activo.

**Acceso**: Autenticado

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `type` | `string` | No | Tipo de item: `service`, `product` |
| `categoryId` | `string` (UUID) | No | Filtrar por categoría |
| `active` | `string` | No | Filtrar por estado: `true`, `false` |

#### Ejemplo

```
GET /v1/catalog?type=service&categoryId=110e8400-e29b-41d4-a716-446655440000
```

#### Responses

**200 OK**

```json
[
  {
    "id": "a10e8400-e29b-41d4-a716-446655440000",
    "categoryId": "110e8400-e29b-41d4-a716-446655440000",
    "type": "service",
    "name": "Corte de Cabello Mujer",
    "price": 350,
    "cost": null,
    "image": null,
    "duration": "45min",
    "stock": null,
    "stockMin": null,
    "alertEnabled": false,
    "brand": null,
    "sku": null,
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "a20e8400-e29b-41d4-a716-446655440001",
    "categoryId": "330e8400-e29b-41d4-a716-446655440002",
    "type": "product",
    "name": "Shampoo Hidratante 500ml",
    "price": 280,
    "cost": 120,
    "image": null,
    "duration": null,
    "stock": 25,
    "stockMin": 5,
    "alertEnabled": true,
    "brand": "L'Oréal",
    "sku": "SH-HYD-500",
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 5.2 Obtener item del catálogo por ID

**GET** `/v1/catalog/:id`

Obtiene un item específico del catálogo.

**Acceso**: Autenticado

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID del item |

#### Responses

**200 OK**

```json
{
  "id": "a10e8400-e29b-41d4-a716-446655440000",
  "categoryId": "110e8400-e29b-41d4-a716-446655440000",
  "type": "service",
  "name": "Corte de Cabello Mujer",
  "price": 350,
  "cost": null,
  "image": null,
  "duration": "45min",
  "stock": null,
  "stockMin": null,
  "alertEnabled": false,
  "brand": null,
  "sku": null,
  "active": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**404 Not Found**

```json
{
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Item no encontrado en el catálogo"
  }
}
```

---

### 5.3 Crear item del catálogo

**POST** `/v1/catalog/items`

Crea un nuevo item (servicio o producto) en el catálogo.

**Acceso**: Requiere permiso `products.write`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `categoryId` | `string` (UUID) | No | ID de la categoría |
| `type` | `string` | Sí | Tipo: `service`, `product` |
| `name` | `string` | Sí | Nombre del item (1-200 caracteres) |
| `price` | `number` | Sí | Precio de venta |
| `cost` | `number` | No | Costo |
| `image` | `string` | No | URL de imagen |
| `duration` | `string` | No | Duración del servicio (ej: "45min") |
| `stock` | `number` | No | Stock actual (productos) |
| `stockMin` | `number` | No | Stock mínimo para alertas |
| `alertEnabled` | `boolean` | No | Activar alertas de stock |
| `brand` | `string` | No | Marca |
| `sku` | `string` | No | Código SKU |
| `active` | `boolean` | No | Estado activo |

```json
{
  "categoryId": "110e8400-e29b-41d4-a716-446655440000",
  "type": "service",
  "name": "Corte + Peinado",
  "price": 500,
  "duration": "60min",
  "active": true
}
```

#### Responses

**201 Created**

```json
{
  "id": "a30e8400-e29b-41d4-a716-446655440002",
  "categoryId": "110e8400-e29b-41d4-a716-446655440000",
  "type": "service",
  "name": "Corte + Peinado",
  "price": 500,
  "cost": null,
  "image": null,
  "duration": "60min",
  "stock": null,
  "stockMin": null,
  "alertEnabled": false,
  "brand": null,
  "sku": null,
  "active": true,
  "createdAt": "2024-03-15T10:00:00.000Z",
  "updatedAt": "2024-03-15T10:00:00.000Z"
}
```

---

### 5.4 Actualizar item del catálogo

**PATCH** `/v1/catalog/items/:id`

Actualiza un item existente del catálogo.

**Acceso**: Requiere permiso `products.write`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID del item |

#### Request Body (todos opcionales)

Mismos campos que crear item.

```json
{
  "price": 550,
  "duration": "75min"
}
```

#### Responses

**200 OK**

```json
{
  "id": "a30e8400-e29b-41d4-a716-446655440002",
  "name": "Corte + Peinado",
  "price": 550,
  "duration": "75min",
  "updatedAt": "2024-03-15T12:00:00.000Z"
}
```

---

### 5.5 Eliminar item del catálogo (soft delete)

**DELETE** `/v1/catalog/items/:id`

Elimina lógicamente un item del catálogo.

**Acceso**: Requiere permiso `products.write`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID del item |

#### Responses

**200 OK**

```json
{
  "message": "Item eliminado correctamente",
  "id": "a30e8400-e29b-41d4-a716-446655440002"
}
```

---

## 6. Ventas

### 6.1 Crear venta

**POST** `/v1/sales`

Registra una nueva venta en el sistema.

**Acceso**: Requiere permiso `tickets.create`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `employeeId` | `string` (UUID) | Sí | ID de la empleada que realiza la venta |
| `customerName` | `string` | No | Nombre del cliente |
| `customerPhone` | `string` | No | Teléfono del cliente |
| `customerIsNew` | `boolean` | No | Indica si el cliente es nuevo |
| `subtotal` | `number` | Sí | Subtotal de la venta |
| `discountTotal` | `number` | No | Total de descuentos |
| `total` | `number` | Sí | Total final |
| `tip` | `number` | No | Propina |
| `lines` | `array` | Sí | Líneas de la venta |
| `lines[].itemId` | `string` (UUID) | Sí | ID del item |
| `lines[].itemType` | `string` | Sí | Tipo: `service`, `product` |
| `lines[].itemName` | `string` | Sí | Nombre del item |
| `lines[].basePrice` | `number` | Sí | Precio base |
| `lines[].price` | `number` | Sí | Precio final (con descuento) |
| `lines[].qty` | `number` | Sí | Cantidad (mínimo 1) |
| `lines[].discountKind` | `string` | No | Tipo de descuento: `percent`, `fixed` |
| `lines[].discountValue` | `number` | No | Valor del descuento |
| `lines[].discountById` | `string` (UUID) | No | ID de quien aplicó el descuento |
| `payments` | `array` | Sí | Pagos realizados |
| `payments[].method` | `string` | Sí | Método: `cash`, `card`, `transfer` |
| `payments[].amount` | `number` | Sí | Monto del pago |
| `payments[].cardLast4` | `string` | No | Últimos 4 dígitos de tarjeta |
| `payments[].cardBrand` | `string` | No | Marca de tarjeta |
| `payments[].authCode` | `string` | No | Código de autorización |

```json
{
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "customerName": "Laura Martínez",
  "customerPhone": "+52 555 111 2222",
  "customerIsNew": true,
  "subtotal": 850,
  "discountTotal": 50,
  "total": 800,
  "tip": 80,
  "lines": [
    {
      "itemId": "a10e8400-e29b-41d4-a716-446655440000",
      "itemType": "service",
      "itemName": "Corte de Cabello Mujer",
      "basePrice": 350,
      "price": 350,
      "qty": 1
    },
    {
      "itemId": "a20e8400-e29b-41d4-a716-446655440001",
      "itemType": "product",
      "itemName": "Shampoo Hidratante 500ml",
      "basePrice": 280,
      "price": 230,
      "qty": 2,
      "discountKind": "percent",
      "discountValue": 10
    }
  ],
  "payments": [
    {
      "method": "card",
      "amount": 800,
      "cardLast4": "1234",
      "cardBrand": "Visa",
      "authCode": "ABC123"
    }
  ]
}
```

#### Responses

**201 Created**

```json
{
  "id": "b10e8400-e29b-41d4-a716-446655440000",
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "customerName": "Laura Martínez",
  "customerPhone": "+52 555 111 2222",
  "subtotal": 850,
  "discountTotal": 50,
  "total": 800,
  "tip": 80,
  "status": "completed",
  "lines": [
    {
      "itemId": "a10e8400-e29b-41d4-a716-446655440000",
      "itemName": "Corte de Cabello Mujer",
      "price": 350,
      "qty": 1
    },
    {
      "itemId": "a20e8400-e29b-41d4-a716-446655440001",
      "itemName": "Shampoo Hidratante 500ml",
      "price": 230,
      "qty": 2
    }
  ],
  "payments": [
    {
      "method": "card",
      "amount": 800,
      "cardLast4": "1234",
      "cardBrand": "Visa"
    }
  ],
  "createdAt": "2024-03-15T14:30:00.000Z"
}
```

**400 Bad Request**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El total de pagos no coincide con el total de la venta"
  }
}
```

---

### 6.2 Listar ventas

**GET** `/v1/sales`

Lista las ventas realizadas con filtros opcionales.

**Acceso**: Requiere permiso `tickets.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `employeeId` | `string` (UUID) | No | Filtrar por empleada |
| `from` | `string` (ISO 8601) | No | Fecha inicio |
| `to` | `string` (ISO 8601) | No | Fecha fin |
| `status` | `string` | No | Estado: `completed`, `voided` |
| `page` | `number` | No | Página (default: 1) |
| `pageSize` | `number` | No | Items por página (default: 50) |

#### Ejemplo

```
GET /v1/sales?employeeId=550e8400-e29b-41d4-a716-446655440000&from=2024-03-01&to=2024-03-31&page=1&pageSize=20
```

#### Responses

**200 OK**

```json
{
  "items": [
    {
      "id": "b10e8400-e29b-41d4-a716-446655440000",
      "employeeId": "550e8400-e29b-41d4-a716-446655440000",
      "employeeName": "María García",
      "customerName": "Laura Martínez",
      "subtotal": 850,
      "discountTotal": 50,
      "total": 800,
      "tip": 80,
      "status": "completed",
      "createdAt": "2024-03-15T14:30:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "pageSize": 20
}
```

---

### 6.3 Obtener venta por ID

**GET** `/v1/sales/:id`

Obtiene los detalles completos de una venta específica.

**Acceso**: Requiere permiso `tickets.read`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la venta |

#### Responses

**200 OK**

```json
{
  "id": "b10e8400-e29b-41d4-a716-446655440000",
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "employeeName": "María García",
  "customerName": "Laura Martínez",
  "customerPhone": "+52 555 111 2222",
  "subtotal": 850,
  "discountTotal": 50,
  "total": 800,
  "tip": 80,
  "status": "completed",
  "lines": [
    {
      "itemId": "a10e8400-e29b-41d4-a716-446655440000",
      "itemType": "service",
      "itemName": "Corte de Cabello Mujer",
      "basePrice": 350,
      "price": 350,
      "qty": 1,
      "discountKind": null,
      "discountValue": null
    },
    {
      "itemId": "a20e8400-e29b-41d4-a716-446655440001",
      "itemType": "product",
      "itemName": "Shampoo Hidratante 500ml",
      "basePrice": 280,
      "price": 230,
      "qty": 2,
      "discountKind": "percent",
      "discountValue": 10
    }
  ],
  "payments": [
    {
      "method": "card",
      "amount": 800,
      "cardLast4": "1234",
      "cardBrand": "Visa",
      "authCode": "ABC123"
    }
  ],
  "createdAt": "2024-03-15T14:30:00.000Z",
  "updatedAt": "2024-03-15T14:30:00.000Z"
}
```

---

### 6.4 Anular venta

**POST** `/v1/sales/:id/void`

Anula una venta existente. Esta acción es irreversible y se registra en auditoría.

**Acceso**: Requiere permiso `tickets.void`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la venta |

#### Responses

**200 OK**

```json
{
  "message": "Venta anulada correctamente",
  "id": "b10e8400-e29b-41d4-a716-446655440000",
  "status": "voided",
  "voidedAt": "2024-03-15T16:00:00.000Z",
  "voidedBy": "550e8400-e29b-41d4-a716-446655440000"
}
```

**400 Bad Request** — Venta ya anulada

```json
{
  "error": {
    "code": "ALREADY_VOIDED",
    "message": "Esta venta ya fue anulada"
  }
}
```

**404 Not Found**

```json
{
  "error": {
    "code": "SALE_NOT_FOUND",
    "message": "Venta no encontrada"
  }
}
```

---

## 7. Inventario

### 7.1 Crear entrada de inventario

**POST** `/v1/inventory/entries`

Registra una entrada o salida de inventario (recepción de productos, consumo interno, etc.).

**Acceso**: Requiere permiso `inventory.create`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `productId` | `string` (UUID) | Sí | ID del producto |
| `kind` | `string` | Sí | Tipo: `inbound`, `outbound`, `consumption` |
| `qtyDelta` | `number` | Sí | Cantidad (positivo para entrada, negativo para salida) |
| `unitCost` | `number` | No | Costo unitario |
| `totalCost` | `number` | No | Costo total |
| `supplier` | `string` | No | Proveedor |
| `invoice` | `string` | No | Número de factura |
| `reason` | `string` | No | Motivo: `purchase`, `return`, `waste`, `theft`, `other` |
| `notes` | `string` | No | Notas adicionales |

```json
{
  "productId": "a20e8400-e29b-41d4-a716-446655440001",
  "kind": "inbound",
  "qtyDelta": 50,
  "unitCost": 120,
  "totalCost": 6000,
  "supplier": "Distribuidora Beauty",
  "invoice": "FAC-2024-001",
  "notes": "Reposición mensual"
}
```

#### Responses

**201 Created**

```json
{
  "id": "c10e8400-e29b-41d4-a716-446655440000",
  "productId": "a20e8400-e29b-41d4-a716-446655440001",
  "productName": "Shampoo Hidratante 500ml",
  "kind": "inbound",
  "qtyDelta": 50,
  "unitCost": 120,
  "totalCost": 6000,
  "supplier": "Distribuidora Beauty",
  "invoice": "FAC-2024-001",
  "notes": "Reposición mensual",
  "createdBy": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-03-15T10:00:00.000Z"
}
```

---

### 7.2 Crear ajuste de inventario

**POST** `/v1/inventory/adjustments`

Crea un ajuste de inventario para corregir el stock (conteo físico, mermas, etc.).

**Acceso**: Requiere permiso `inventory.adjust`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `productId` | `string` (UUID) | Sí | ID del producto |
| `mode` | `string` | Sí | Modo: `set` (establecer valor), `delta` (agregar/restar) |
| `value` | `number` | Sí | Valor del ajuste |
| `reason` | `string` | Sí | Motivo: `purchase`, `return`, `waste`, `theft`, `other` |
| `notes` | `string` | No | Notas adicionales |

```json
{
  "productId": "a20e8400-e29b-41d4-a716-446655440001",
  "mode": "set",
  "value": 23,
  "reason": "waste",
  "notes": "Ajuste por conteo físico - 2 unidades dañadas"
}
```

#### Responses

**201 Created**

```json
{
  "id": "c20e8400-e29b-41d4-a716-446655440001",
  "productId": "a20e8400-e29b-41d4-a716-446655440001",
  "productName": "Shampoo Hidratante 500ml",
  "mode": "set",
  "value": 23,
  "previousStock": 25,
  "newStock": 23,
  "reason": "waste",
  "notes": "Ajuste por conteo físico - 2 unidades dañadas",
  "createdBy": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-03-15T11:00:00.000Z"
}
```

---

### 7.3 Listar entradas de inventario

**GET** `/v1/inventory/entries`

Lista el historial de movimientos de inventario.

**Acceso**: Requiere permiso `inventory.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `productId` | `string` (UUID) | No | Filtrar por producto |
| `page` | `number` | No | Página (default: 1) |
| `pageSize` | `number` | No | Items por página (default: 50) |

#### Responses

**200 OK**

```json
{
  "items": [
    {
      "id": "c10e8400-e29b-41d4-a716-446655440000",
      "productId": "a20e8400-e29b-41d4-a716-446655440001",
      "productName": "Shampoo Hidratante 500ml",
      "kind": "inbound",
      "qtyDelta": 50,
      "unitCost": 120,
      "totalCost": 6000,
      "supplier": "Distribuidora Beauty",
      "invoice": "FAC-2024-001",
      "notes": "Reposición mensual",
      "createdBy": "550e8400-e29b-41d4-a716-446655440000",
      "createdByName": "María García",
      "createdAt": "2024-03-15T10:00:00.000Z"
    }
  ],
  "total": 120,
  "page": 1,
  "pageSize": 50
}
```

---

## 8. Timeclock / Asistencia

### 8.1 Registrar entrada (Punch In)

**POST** `/v1/timeclock/punch-in`

Registra la entrada (clock-in) del usuario autenticado.

**Acceso**: Autenticado

#### Responses

**201 Created**

```json
{
  "id": "d10e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "userName": "María García",
  "inAt": "2024-03-15T09:00:00.000Z",
  "outAt": null,
  "status": "clocked_in"
}
```

**400 Bad Request** — Ya tiene entrada registrada sin salida

```json
{
  "error": {
    "code": "ALREADY_CLOCKED_IN",
    "message": "Ya tienes una entrada registrada sin salida"
  }
}
```

---

### 8.2 Registrar salida (Punch Out)

**POST** `/v1/timeclock/punch-out`

Registra la salida (clock-out) del usuario autenticado.

**Acceso**: Autenticado

#### Responses

**200 OK**

```json
{
  "id": "d10e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "userName": "María García",
  "inAt": "2024-03-15T09:00:00.000Z",
  "outAt": "2024-03-15T18:00:00.000Z",
  "hoursWorked": 9,
  "status": "completed"
}
```

**400 Bad Request** — No hay entrada registrada

```json
{
  "error": {
    "code": "NOT_CLOCKED_IN",
    "message": "No tienes una entrada registrada"
  }
}
```

---

### 8.3 Entradas de hoy

**GET** `/v1/timeclock/today`

Obtiene los registros de asistencia del día actual para el usuario autenticado. Si es admin, puede ver todos los registros del día.

**Acceso**: Autenticado

#### Responses

**200 OK**

```json
[
  {
    "id": "d10e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "userName": "María García",
    "inAt": "2024-03-15T09:00:00.000Z",
    "outAt": "2024-03-15T18:00:00.000Z",
    "hoursWorked": 9,
    "status": "completed"
  }
]
```

---

### 8.4 Historial de asistencia

**GET** `/v1/timeclock/history`

Obtiene el historial de asistencia con filtros opcionales.

**Acceso**: Requiere permiso `attendance.read_all`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `userId` | `string` (UUID) | No | Filtrar por usuario |
| `from` | `string` (ISO 8601) | No | Fecha inicio |
| `to` | `string` (ISO 8601) | No | Fecha fin |

#### Responses

**200 OK**

```json
[
  {
    "id": "d10e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "userName": "María García",
    "inAt": "2024-03-15T09:00:00.000Z",
    "outAt": "2024-03-15T18:00:00.000Z",
    "hoursWorked": 9,
    "status": "completed"
  },
  {
    "id": "d20e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "userName": "María García",
    "inAt": "2024-03-14T09:05:00.000Z",
    "outAt": "2024-03-14T18:10:00.000Z",
    "hoursWorked": 9.08,
    "status": "completed"
  }
]
```

---

### 8.5 Actualizar entrada de asistencia

**PATCH** `/v1/timeclock/entries/:id`

Actualiza un registro de asistencia existente (corrección manual).

**Acceso**: Requiere permiso `attendance.read_all`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID del registro |

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `inAt` | `string` (ISO 8601) | Sí | Fecha/hora de entrada |
| `outAt` | `string` (ISO 8601) | No | Fecha/hora de salida |

```json
{
  "inAt": "2024-03-15T08:45:00.000Z",
  "outAt": "2024-03-15T17:45:00.000Z"
}
```

#### Responses

**200 OK**

```json
{
  "id": "d10e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "userName": "María García",
  "inAt": "2024-03-15T08:45:00.000Z",
  "outAt": "2024-03-15T17:45:00.000Z",
  "hoursWorked": 9,
  "status": "completed",
  "updatedAt": "2024-03-15T19:00:00.000Z"
}
```

---

### 8.6 Resumen de asistencia

**GET** `/v1/timeclock/summary`

Obtiene un resumen de horas trabajadas por período.

**Acceso**: Autenticado (admin ve todos, empleada ve solo los suyos)

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `range` | `string` | Sí | Período: `week`, `biweek`, `month` |

#### Ejemplo

```
GET /v1/timeclock/summary?range=biweek
```

#### Responses

**200 OK**

```json
{
  "range": "biweek",
  "from": "2024-03-01T00:00:00.000Z",
  "to": "2024-03-15T23:59:59.999Z",
  "entries": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "userName": "María García",
      "totalHours": 135.5,
      "daysWorked": 15,
      "averageHoursPerDay": 9.03
    },
    {
      "userId": "660e8400-e29b-41d4-a716-446655440001",
      "userName": "Ana López",
      "totalHours": 120,
      "daysWorked": 14,
      "averageHoursPerDay": 8.57
    }
  ]
}
```

---

## 9. Metas / Bonos

### 9.1 Listar metas

**GET** `/v1/goals`

Obtiene todas las metas/bonos configurados en el sistema.

**Acceso**: Autenticado

#### Responses

**200 OK**

```json
[
  {
    "id": "e10e8400-e29b-41d4-a716-446655440000",
    "icon": "🎯",
    "label": "Meta de Ventas Mensual",
    "description": "Alcanzar $50,000 en ventas este mes",
    "metric": "sales_total",
    "unit": "MXN",
    "target": 50000,
    "reward": "Bono de $2,000",
    "rewardType": "fixed",
    "rewardValue": 2000,
    "tone": "motivational",
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 9.2 Obtener progreso de metas

**GET** `/v1/goals/progress`

Obtiene el progreso actual de las metas para el usuario autenticado o para un usuario específico.

**Acceso**: Autenticado

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `userId` | `string` | No | ID del usuario o `me` para el actual |

#### Ejemplo

```
GET /v1/goals/progress?userId=me
```

#### Responses

**200 OK**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "userName": "María García",
  "goals": [
    {
      "id": "e10e8400-e29b-41d4-a716-446655440000",
      "label": "Meta de Ventas Mensual",
      "metric": "sales_total",
      "target": 50000,
      "current": 35000,
      "progress": 70,
      "unit": "MXN",
      "reward": "Bono de $2,000",
      "rewardType": "fixed",
      "rewardValue": 2000,
      "tone": "motivational"
    }
  ]
}
```

---

### 9.3 Obtener meta por ID

**GET** `/v1/goals/:id`

Obtiene una meta específica.

**Acceso**: Autenticado

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la meta |

#### Responses

**200 OK**

```json
{
  "id": "e10e8400-e29b-41d4-a716-446655440000",
  "icon": "🎯",
  "label": "Meta de Ventas Mensual",
  "description": "Alcanzar $50,000 en ventas este mes",
  "metric": "sales_total",
  "unit": "MXN",
  "target": 50000,
  "reward": "Bono de $2,000",
  "rewardType": "fixed",
  "rewardValue": 2000,
  "tone": "motivational",
  "active": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 9.4 Crear meta

**POST** `/v1/goals`

Crea una nueva meta/bono.

**Acceso**: Requiere permiso `bonuses.manage`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `icon` | `string` | Sí | Icono/emoji (1-60 caracteres) |
| `label` | `string` | Sí | Nombre de la meta (1-100 caracteres) |
| `description` | `string` | No | Descripción |
| `metric` | `string` | Sí | Métrica: `sales_total`, `services_count`, `products_count`, `new_clients` |
| `unit` | `string` | Sí | Unidad de medida |
| `target` | `number` | Sí | Valor objetivo |
| `reward` | `string` | No | Descripción de la recompensa |
| `rewardType` | `string` | Sí | Tipo: `fixed`, `percent`, `custom` |
| `rewardValue` | `number` | No | Valor de la recompensa |
| `tone` | `string` | Sí | Tono: `motivational`, `professional`, `fun` |
| `active` | `boolean` | No | Estado activo |

```json
{
  "icon": "⭐",
  "label": "Meta de Servicios Semanales",
  "description": "Realizar 30 servicios en la semana",
  "metric": "services_count",
  "unit": "servicios",
  "target": 30,
  "reward": "Tarjeta de regalo $500",
  "rewardType": "fixed",
  "rewardValue": 500,
  "tone": "motivational",
  "active": true
}
```

#### Responses

**201 Created**

```json
{
  "id": "e20e8400-e29b-41d4-a716-446655440001",
  "icon": "⭐",
  "label": "Meta de Servicios Semanales",
  "description": "Realizar 30 servicios en la semana",
  "metric": "services_count",
  "unit": "servicios",
  "target": 30,
  "reward": "Tarjeta de regalo $500",
  "rewardType": "fixed",
  "rewardValue": 500,
  "tone": "motivational",
  "active": true,
  "createdAt": "2024-03-15T10:00:00.000Z",
  "updatedAt": "2024-03-15T10:00:00.000Z"
}
```

---

### 9.5 Actualizar meta

**PATCH** `/v1/goals/:id`

Actualiza una meta existente.

**Acceso**: Requiere permiso `bonuses.manage`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la meta |

#### Request Body (todos opcionales)

Mismos campos que crear meta.

```json
{
  "target": 35,
  "rewardValue": 700
}
```

#### Responses

**200 OK**

```json
{
  "id": "e20e8400-e29b-41d4-a716-446655440001",
  "target": 35,
  "rewardValue": 700,
  "updatedAt": "2024-03-15T12:00:00.000Z"
}
```

---

### 9.6 Eliminar meta (soft delete)

**DELETE** `/v1/goals/:id`

Elimina lógicamente una meta.

**Acceso**: Requiere permiso `bonuses.manage`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la meta |

#### Responses

**200 OK**

```json
{
  "message": "Meta eliminada correctamente",
  "id": "e20e8400-e29b-41d4-a716-446655440001"
}
```

---

## 10. Promociones

### 10.1 Listar promociones

**GET** `/v1/promotions`

Lista todas las promociones activas o todas según el filtro.

**Acceso**: Autenticado

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `active` | `boolean` | No | Filtrar por estado activo |

#### Responses

**200 OK**

```json
[
  {
    "id": "f10e8400-e29b-41d4-a716-446655440000",
    "name": "20% de descuento en coloración",
    "description": "Promoción válida todo el mes de marzo",
    "off": "20%",
    "rule": {
      "category": "coloracion",
      "validFrom": "2024-03-01",
      "validTo": "2024-03-31"
    },
    "active": true,
    "createdAt": "2024-03-01T00:00:00.000Z",
    "updatedAt": "2024-03-01T00:00:00.000Z"
  }
]
```

---

### 10.2 Obtener promoción por ID

**GET** `/v1/promotions/:id`

Obtiene una promoción específica.

**Acceso**: Autenticado

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la promoción |

#### Responses

**200 OK**

```json
{
  "id": "f10e8400-e29b-41d4-a716-446655440000",
  "name": "20% de descuento en coloración",
  "description": "Promoción válida todo el mes de marzo",
  "off": "20%",
  "rule": {
    "category": "coloracion",
    "validFrom": "2024-03-01",
    "validTo": "2024-03-31"
  },
  "active": true,
  "createdAt": "2024-03-01T00:00:00.000Z",
  "updatedAt": "2024-03-01T00:00:00.000Z"
}
```

---

### 10.3 Crear promoción

**POST** `/v1/promotions`

Crea una nueva promoción.

**Acceso**: Requiere permiso `offers.write`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | Sí | Nombre (1-120 caracteres) |
| `description` | `string` | No | Descripción |
| `off` | `string` | Sí | Descripción del descuento (1-40 caracteres) |
| `rule` | `object` | No | Reglas de la promoción |
| `active` | `boolean` | No | Estado activo |

```json
{
  "name": "Viernes de Descuento",
  "description": "15% en todos los servicios los viernes",
  "off": "15%",
  "rule": {
    "dayOfWeek": "friday",
    "allServices": true
  },
  "active": true
}
```

#### Responses

**201 Created**

```json
{
  "id": "f20e8400-e29b-41d4-a716-446655440001",
  "name": "Viernes de Descuento",
  "description": "15% en todos los servicios los viernes",
  "off": "15%",
  "rule": {
    "dayOfWeek": "friday",
    "allServices": true
  },
  "active": true,
  "createdAt": "2024-03-15T10:00:00.000Z",
  "updatedAt": "2024-03-15T10:00:00.000Z"
}
```

---

### 10.4 Actualizar promoción

**PATCH** `/v1/promotions/:id`

Actualiza una promoción existente.

**Acceso**: Requiere permiso `offers.write`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la promoción |

#### Request Body (todos opcionales)

Mismos campos que crear promoción.

```json
{
  "off": "20%",
  "active": false
}
```

#### Responses

**200 OK**

```json
{
  "id": "f20e8400-e29b-41d4-a716-446655440001",
  "off": "20%",
  "active": false,
  "updatedAt": "2024-03-15T12:00:00.000Z"
}
```

---

### 10.5 Eliminar promoción

**DELETE** `/v1/promotions/:id`

Elimina una promoción.

**Acceso**: Requiere permiso `offers.write`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la promoción |

#### Responses

**200 OK**

```json
{
  "message": "Promoción eliminada correctamente",
  "id": "f20e8400-e29b-41d4-a716-446655440001"
}
```

---

## 11. Alertas

### 11.1 Listar alertas

**GET** `/v1/alerts`

Lista todas las alertas del sistema (stock bajo, productos de movimiento lento, etc.).

**Acceso**: Requiere permiso `analytics.read`

#### Responses

**200 OK**

```json
[
  {
    "id": "g10e8400-e29b-41d4-a716-446655440000",
    "type": "low_stock",
    "productId": "a20e8400-e29b-41d4-a716-446655440001",
    "productName": "Shampoo Hidratante 500ml",
    "message": "Stock bajo: 3 unidades restantes (mínimo: 5)",
    "severity": "warning",
    "status": "open",
    "snoozedUntil": null,
    "resolvedAt": null,
    "resolvedBy": null,
    "createdAt": "2024-03-15T08:00:00.000Z"
  },
  {
    "id": "g20e8400-e29b-41d4-a716-446655440001",
    "type": "slow_mover",
    "productId": "a30e8400-e29b-41d4-a716-446655440002",
    "productName": "Acondicionador Seco 300ml",
    "message": "Producto de movimiento lento: 0 ventas en 30 días",
    "severity": "info",
    "status": "open",
    "suggestedOfferKind": "percent",
    "suggestedOfferValue": 15,
    "createdAt": "2024-03-14T08:00:00.000Z"
  }
]
```

---

### 11.2 Resolver alerta

**POST** `/v1/alerts/:id/resolve`

Marca una alerta como resuelta.

**Acceso**: Requiere permiso `analytics.read`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la alerta |

#### Request Body (opcional)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `notes` | `string` | Notas de resolución |

```json
{
  "notes": "Stock reabastecido con orden FAC-2024-002"
}
```

#### Responses

**200 OK**

```json
{
  "id": "g10e8400-e29b-41d4-a716-446655440000",
  "status": "resolved",
  "resolvedAt": "2024-03-15T10:00:00.000Z",
  "resolvedBy": "550e8400-e29b-41d4-a716-446655440000",
  "notes": "Stock reabastecido con orden FAC-2024-002"
}
```

---

### 11.3 Posponer alerta

**POST** `/v1/alerts/:id/snooze`

Pospone una alerta hasta una fecha específica.

**Acceso**: Requiere permiso `analytics.read`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la alerta |

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `snoozedUntil` | `string` (ISO 8601) | Sí | Fecha hasta la cual posponer |

```json
{
  "snoozedUntil": "2024-03-20T00:00:00.000Z"
}
```

#### Responses

**200 OK**

```json
{
  "id": "g10e8400-e29b-41d4-a716-446655440000",
  "status": "snoozed",
  "snoozedUntil": "2024-03-20T00:00:00.000Z"
}
```

---

### 11.4 Reabrir alerta

**POST** `/v1/alerts/:id/reopen`

Reabre una alerta que fue resuelta o pospuesta.

**Acceso**: Requiere permiso `analytics.read`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID de la alerta |

#### Responses

**200 OK**

```json
{
  "id": "g10e8400-e29b-41d4-a716-446655440000",
  "status": "open",
  "reopenedAt": "2024-03-15T12:00:00.000Z"
}
```

---

### 11.5 Actualizar configuración de stock

**PUT** `/v1/alerts/stock-config`

Actualiza la configuración global de alertas de stock.

**Acceso**: Requiere permiso `inventory.adjust`

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `defaultMinStock` | `number` | Sí | Stock mínimo por defecto |
| `enabledByDefault` | `boolean` | Sí | Alertas habilitadas por defecto |

```json
{
  "defaultMinStock": 10,
  "enabledByDefault": true
}
```

#### Responses

**200 OK**

```json
{
  "message": "Configuración de stock actualizada",
  "defaultMinStock": 10,
  "enabledByDefault": true
}
```

---

### 11.6 Actualizar producto de movimiento lento

**PATCH** `/v1/alerts/slow-movers/:id`

Actualiza la oferta sugerida para un producto de movimiento lento.

**Acceso**: Requiere permiso `offers.write`

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` (UUID) | Sí | ID del producto |

#### Request Body (todos opcionales)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `suggestedOfferKind` | `string` | Tipo: `percent`, `fixed` |
| `suggestedOfferValue` | `number` | Valor de la oferta |
| `offerActive` | `boolean` | Estado de la oferta |

```json
{
  "suggestedOfferKind": "percent",
  "suggestedOfferValue": 25,
  "offerActive": true
}
```

#### Responses

**200 OK**

```json
{
  "id": "g20e8400-e29b-41d4-a716-446655440001",
  "productId": "a30e8400-e29b-41d4-a716-446655440002",
  "productName": "Acondicionador Seco 300ml",
  "suggestedOfferKind": "percent",
  "suggestedOfferValue": 25,
  "offerActive": true,
  "updatedAt": "2024-03-15T12:00:00.000Z"
}
```

---

## 12. Nómina

### 12.1 Calcular nómina

**GET** `/v1/payroll`

Calcula la nómina para un período específico.

**Acceso**: Requiere permiso `payroll.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `month` | `string` | Sí | Mes en formato `YYYY-MM` |
| `period` | `string` | No | Período: `biweek`, `month` (default: `month`) |

#### Ejemplo

```
GET /v1/payroll?month=2024-03&period=month
```

#### Responses

**200 OK**

```json
{
  "month": "2024-03",
  "period": "month",
  "from": "2024-03-01T00:00:00.000Z",
  "to": "2024-03-31T23:59:59.999Z",
  "employees": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "userName": "María García",
      "role": "admin",
      "payType": "commission",
      "baseSalary": 5000,
      "totalSales": 45000,
      "commissionRate": 40,
      "commissionAmount": 18000,
      "totalHours": 180,
      "bonusAmount": 2000,
      "totalPay": 25000
    },
    {
      "userId": "660e8400-e29b-41d4-a716-446655440001",
      "userName": "Ana López",
      "role": "empleada",
      "payType": "commission",
      "baseSalary": 3000,
      "totalSales": 32000,
      "commissionRate": 35,
      "commissionAmount": 11200,
      "totalHours": 160,
      "bonusAmount": 0,
      "totalPay": 14200
    }
  ],
  "totalPayroll": 39200
}
```

---

## 13. Analíticas

### 13.1 Ventas por día

**GET** `/v1/analytics/sales-by-day`

Obtiene las ventas agrupadas por día.

**Acceso**: Requiere permiso `analytics.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `range` | `string` | No | Rango: `week`, `biweek`, `month`, `year` (default: `month`) |

#### Responses

**200 OK**

```json
[
  {
    "date": "2024-03-15",
    "totalSales": 12,
    "totalRevenue": 8500,
    "averageTicket": 708.33,
    "totalTips": 850
  },
  {
    "date": "2024-03-14",
    "totalSales": 15,
    "totalRevenue": 10200,
    "averageTicket": 680,
    "totalTips": 1020
  }
]
```

---

### 13.2 Ingreso por categoría

**GET** `/v1/analytics/category-revenue`

Obtiene los ingresos desglosados por categoría.

**Acceso**: Requiere permiso `analytics.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `range` | `string` | No | Rango de tiempo |

#### Responses

**200 OK**

```json
[
  {
    "categoryId": "110e8400-e29b-41d4-a716-446655440000",
    "categoryName": "Corte de Cabello",
    "totalRevenue": 25000,
    "totalSales": 85,
    "averageTicket": 294.12
  },
  {
    "categoryId": "220e8400-e29b-41d4-a716-446655440001",
    "categoryName": "Coloración",
    "totalRevenue": 45000,
    "totalSales": 30,
    "averageTicket": 1500
  },
  {
    "categoryId": "330e8400-e29b-41d4-a716-446655440002",
    "categoryName": "Productos",
    "totalRevenue": 12000,
    "totalSales": 60,
    "averageTicket": 200
  }
]
```

---

### 13.3 Top empleadas

**GET** `/v1/analytics/top-employees`

Obtiene el ranking de empleadas por rendimiento.

**Acceso**: Requiere permiso `analytics.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `range` | `string` | No | Rango de tiempo |

#### Responses

**200 OK**

```json
[
  {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "userName": "María García",
    "totalSales": 125,
    "totalRevenue": 65000,
    "averageTicket": 520,
    "totalTips": 6500,
    "rank": 1
  },
  {
    "userId": "660e8400-e29b-41d4-a716-446655440001",
    "userName": "Ana López",
    "totalSales": 98,
    "totalRevenue": 48000,
    "averageTicket": 489.80,
    "totalTips": 4800,
    "rank": 2
  }
]
```

---

### 13.4 Tráfico por hora

**GET** `/v1/analytics/hourly-traffic`

Obtiene el tráfico de ventas por hora del día.

**Acceso**: Requiere permiso `analytics.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `date` | `string` (ISO 8601) | No | Fecha específica (default: hoy) |

#### Responses

**200 OK**

```json
[
  { "hour": 9, "sales": 2, "revenue": 700 },
  { "hour": 10, "sales": 5, "revenue": 2500 },
  { "hour": 11, "sales": 8, "revenue": 4200 },
  { "hour": 12, "sales": 6, "revenue": 3100 },
  { "hour": 13, "sales": 4, "revenue": 1800 },
  { "hour": 14, "sales": 7, "revenue": 3500 },
  { "hour": 15, "sales": 9, "revenue": 4800 },
  { "hour": 16, "sales": 6, "revenue": 3200 },
  { "hour": 17, "sales": 4, "revenue": 2100 },
  { "hour": 18, "sales": 2, "revenue": 900 }
]
```

---

### 13.5 KPIs

**GET** `/v1/analytics/kpis`

Obtiene los indicadores clave de rendimiento (KPIs) del negocio.

**Acceso**: Requiere permiso `analytics.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `range` | `string` | No | Rango de tiempo |

#### Responses

**200 OK**

```json
{
  "totalRevenue": 82000,
  "totalSales": 285,
  "averageTicket": 287.72,
  "totalTips": 8200,
  "newCustomers": 25,
  "returningCustomers": 180,
  "servicesRevenue": 70000,
  "productsRevenue": 12000,
  "servicesPercentage": 85.37,
  "productsPercentage": 14.63,
  "topCategory": "Coloración",
  "topEmployee": "María García",
  "comparison": {
    "revenueChange": 12.5,
    "salesChange": 8.3,
    "averageTicketChange": 3.8
  }
}
```

---

## 14. Reportes

### 14.1 Reporte Excel

**GET** `/v1/reports/:type/excel`

Genera un reporte en formato Excel.

**Acceso**: Requiere permiso `reports.read`

**Estado**: ⚠️ No implementado (stub - retorna 501)

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `type` | `string` | Sí | Tipo de reporte |

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `from` | `string` (ISO 8601) | No | Fecha inicio |
| `to` | `string` (ISO 8601) | No | Fecha fin |

#### Responses

**501 Not Implemented**

```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Reportes Excel aún no implementados"
  }
}
```

---

### 14.2 Reporte PDF

**GET** `/v1/reports/:type/pdf`

Genera un reporte en formato PDF.

**Acceso**: Requiere permiso `reports.read`

**Estado**: ⚠️ No implementado (stub - retorna 501)

#### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `type` | `string` | Sí | Tipo de reporte |

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `from` | `string` (ISO 8601) | No | Fecha inicio |
| `to` | `string` (ISO 8601) | No | Fecha fin |

#### Responses

**501 Not Implemented**

```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Reportes PDF aún no implementados"
  }
}
```

---

## 15. Configuración

### 15.1 Obtener configuración

**GET** `/v1/settings`

Obtiene todas las configuraciones del sistema.

**Acceso**: Requiere permiso `users.write`

#### Responses

**200 OK**

```json
[
  {
    "id": "h10e8400-e29b-41d4-a716-446655440000",
    "key": "salon.name",
    "value": "Ely's Salon",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "h20e8400-e29b-41d4-a716-446655440001",
    "key": "salon.phone",
    "value": "+52 555 123 4567",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "h30e8400-e29b-41d4-a716-446655440002",
    "key": "salon.address",
    "value": "Av. Principal #123, Col. Centro",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "h40e8400-e29b-41d4-a716-446655440003",
    "key": "tax.rate",
    "value": 0.16,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 15.2 Actualizar configuración

**PUT** `/v1/settings`

Actualiza o crea configuraciones del sistema (upsert).

**Acceso**: Requiere permiso `users.write`

#### Request Body

Array de objetos de configuración.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `key` | `string` | Sí | Clave de configuración |
| `value` | `object` | Sí | Valor (puede ser cualquier tipo) |

```json
[
  {
    "key": "salon.name",
    "value": "Ely's Salon & Spa"
  },
  {
    "key": "salon.hours",
    "value": {
      "monday": "09:00-19:00",
      "tuesday": "09:00-19:00",
      "wednesday": "09:00-19:00",
      "thursday": "09:00-19:00",
      "friday": "09:00-20:00",
      "saturday": "09:00-18:00",
      "sunday": "closed"
    }
  },
  {
    "key": "tax.rate",
    "value": 0.16
  }
]
```

#### Responses

**200 OK**

```json
{
  "message": "Configuración actualizada correctamente",
  "updated": 3,
  "settings": [
    {
      "key": "salon.name",
      "value": "Ely's Salon & Spa",
      "updatedAt": "2024-03-15T10:00:00.000Z"
    },
    {
      "key": "salon.hours",
      "value": {
        "monday": "09:00-19:00",
        "tuesday": "09:00-19:00",
        "wednesday": "09:00-19:00",
        "thursday": "09:00-19:00",
        "friday": "09:00-20:00",
        "saturday": "09:00-18:00",
        "sunday": "closed"
      },
      "updatedAt": "2024-03-15T10:00:00.000Z"
    },
    {
      "key": "tax.rate",
      "value": 0.16,
      "updatedAt": "2024-03-15T10:00:00.000Z"
    }
  ]
}
```

---

### 15.3 Trigger backup

**POST** `/v1/settings/backup`

Dispara un respaldo manual de la base de datos.

**Acceso**: Requiere permiso `users.write`

#### Responses

**200 OK**

```json
{
  "message": "Respaldo iniciado correctamente",
  "backupId": "backup-2024-03-15-10-00-00",
  "status": "in_progress",
  "startedAt": "2024-03-15T10:00:00.000Z"
}
```

---

## 16. Preferencias de Usuario

### 16.1 Obtener preferencias

**GET** `/v1/me/preferences`

Obtiene las preferencias del usuario autenticado (tema, idioma, notificaciones, etc.).

**Acceso**: Autenticado

#### Responses

**200 OK**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "value": {
    "theme": "dark",
    "language": "es",
    "notifications": {
      "email": true,
      "push": false,
      "alerts": true
    },
    "dashboard": {
      "defaultRange": "week",
      "widgets": ["sales", "topEmployees", "kpis"]
    }
  }
}
```

---

### 16.2 Actualizar preferencias

**PUT** `/v1/me/preferences`

Actualiza las preferencias del usuario autenticado.

**Acceso**: Autenticado

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `value` | `object` | Sí | Objeto con las preferencias |

```json
{
  "value": {
    "theme": "light",
    "language": "es",
    "notifications": {
      "email": false,
      "push": true,
      "alerts": true
    },
    "dashboard": {
      "defaultRange": "month",
      "widgets": ["sales", "categoryRevenue", "hourlyTraffic"]
    }
  }
}
```

#### Responses

**200 OK**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "value": {
    "theme": "light",
    "language": "es",
    "notifications": {
      "email": false,
      "push": true,
      "alerts": true
    },
    "dashboard": {
      "defaultRange": "month",
      "widgets": ["sales", "categoryRevenue", "hourlyTraffic"]
    }
  },
  "updatedAt": "2024-03-15T10:00:00.000Z"
}
```

---

## 17. Auditoría

### 17.1 Listar logs de auditoría

**GET** `/v1/audit`

Obtiene los logs de auditoría del sistema con paginación.

**Acceso**: Requiere permiso `audit.read`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `page` | `number` | No | Página (default: 1, mínimo: 1) |
| `pageSize` | `number` | No | Items por página (default: 50, mínimo: 1) |

#### Responses

**200 OK**

```json
{
  "items": [
    {
      "id": "i10e8400-e29b-41d4-a716-446655440000",
      "action": "auth.unlock",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "userName": "María García",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "details": {
        "success": true
      },
      "createdAt": "2024-03-15T09:00:00.000Z"
    },
    {
      "id": "i20e8400-e29b-41d4-a716-446655440001",
      "action": "sale.create",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "userName": "María García",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "details": {
        "saleId": "b10e8400-e29b-41d4-a716-446655440000",
        "total": 800
      },
      "createdAt": "2024-03-15T14:30:00.000Z"
    },
    {
      "id": "i30e8400-e29b-41d4-a716-446655440002",
      "action": "sale.void",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "userName": "María García",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "details": {
        "saleId": "b10e8400-e29b-41d4-a716-446655440000"
      },
      "createdAt": "2024-03-15T16:00:00.000Z"
    }
  ],
  "total": 1500,
  "page": 1,
  "pageSize": 50
}
```

---

## 18. Eventos (WebSocket)

### 18.1 WebSocket placeholder

**GET** `/v1/events`

Endpoint placeholder para la conexión WebSocket. La conexión real se establece vía WebSocket con el token como query parameter.

**Acceso**: Público

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `token` | `string` | Sí | JWT de autenticación |

#### Ejemplo

```
ws://localhost:3001/v1/events?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Responses

**200 OK** (HTTP fallback)

```json
{
  "message": "WebSocket endpoint available at /v1/events?token=..."
}
```

---

## Referencia de Errores

### Códigos de error comunes

| Código HTTP | Código de Error | Descripción |
|-------------|-----------------|-------------|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 401 | `UNAUTHORIZED` | Token inválido o expirado |
| 403 | `FORBIDDEN` | Sin permisos suficientes |
| 404 | `*_NOT_FOUND` | Recurso no encontrado |
| 409 | `CONFLICT` | Conflicto con estado actual |
| 429 | `TOO_MANY_ATTEMPTS` | Demasiados intentos (rate limit) |
| 500 | `INTERNAL_ERROR` | Error interno del servidor |
| 501 | `NOT_IMPLEMENTED` | Funcionalidad no implementada |

### Formato de error

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error en español",
    "fields": [
      {
        "field": "nombre_del_campo",
        "message": "Descripción específica del campo"
      }
    ]
  }
}
```

---

## Enumeraciones

### Roles

| Valor | Descripción |
|-------|-------------|
| `admin` | Administradora con acceso completo |
| `empleada` | Empleada con permisos limitados |

### Estados de Usuario

| Valor | Descripción |
|-------|-------------|
| `active` | Activa |
| `inactive` | Inactiva |
| `vacation` | En vacaciones |

### Tipos de Item

| Valor | Descripción |
|-------|-------------|
| `service` | Servicio |
| `product` | Producto |

### Métodos de Pago

| Valor | Descripción |
|-------|-------------|
| `cash` | Efectivo |
| `card` | Tarjeta |
| `transfer` | Transferencia |

### Tipos de Descuento

| Valor | Descripción |
|-------|-------------|
| `percent` | Porcentaje |
| `fixed` | Monto fijo |

### Estados de Venta

| Valor | Descripción |
|-------|-------------|
| `completed` | Completada |
| `voided` | Anulada |

### Tipos de Inventario

| Valor | Descripción |
|-------|-------------|
| `inbound` | Entrada |
| `outbound` | Salida |
| `consumption` | Consumo interno |

### Motivos de Ajuste

| Valor | Descripción |
|-------|-------------|
| `purchase` | Compra |
| `return` | Devolución |
| `waste` | Merma/Daño |
| `theft` | Robo |
| `other` | Otro |

### Tipos de Pago

| Valor | Descripción |
|-------|-------------|
| `salary` | Salario fijo |
| `commission` | Comisión |
| `mixed` | Mixto |

### Métricas de Meta

| Valor | Descripción |
|-------|-------------|
| `sales_total` | Total de ventas |
| `services_count` | Cantidad de servicios |
| `products_count` | Cantidad de productos |
| `new_clients` | Clientes nuevos |

### Tipos de Recompensa

| Valor | Descripción |
|-------|-------------|
| `fixed` | Monto fijo |
| `percent` | Porcentaje |
| `custom` | Personalizado |

### Tonos de Meta

| Valor | Descripción |
|-------|-------------|
| `motivational` | Motivacional |
| `professional` | Profesional |
| `fun` | Divertido |

### Rangos de Tiempo

| Valor | Descripción |
|-------|-------------|
| `week` | Semana |
| `biweek` | Quincena |
| `month` | Mes |
| `year` | Año |

---

## Permisos Disponibles

| Permiso | Descripción |
|---------|-------------|
| `users.read` | Ver lista de usuarias |
| `users.write` | Crear/editar usuarias |
| `users.delete` | Eliminar usuarias |
| `users.permissions.manage` | Gestionar permisos y matriz |
| `categories.write` | Gestionar categorías |
| `products.write` | Gestionar productos/servicios |
| `tickets.create` | Crear ventas |
| `tickets.read` | Ver ventas |
| `tickets.void` | Anular ventas |
| `inventory.create` | Crear entradas de inventario |
| `inventory.read` | Ver inventario |
| `inventory.adjust` | Ajustar inventario |
| `attendance.read_all` | Ver asistencia de todas |
| `bonuses.manage` | Gestionar metas/bonos |
| `offers.write` | Gestionar promociones |
| `analytics.read` | Ver analíticas y alertas |
| `payroll.read` | Ver nómina |
| `reports.read` | Generar reportes |
| `audit.read` | Ver logs de auditoría |

---

*Documentación generada el 2024-03-15 | API Version: v1 | Base URL: `/v1`*
