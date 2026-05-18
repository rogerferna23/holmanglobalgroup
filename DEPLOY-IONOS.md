# HGG — Guía de deploy a IONOS Hosting Plus

Web hecha en **Vite + React + TypeScript + Supabase + Stripe**. Mismo stack que tu DelegaWeb.

## 📋 Pre-requisitos (una sola vez)

### A) Crear archivo `.env.local`

En la raíz del proyecto, crea `.env.local` con:

```
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_PAYMENT_CURRENCY=USD
VITE_REFERENCE_PREFIX=HGG
```

⚠️ **Importante**: en Vite las env vars del cliente empiezan con `VITE_` (no `NEXT_PUBLIC_`). Si vienes de Next.js, recuerda este cambio.

### B) Configurar Supabase

1. **Correr la migración SQL**:
   - Supabase Dashboard → SQL Editor → New query
   - Pega el contenido de `supabase/migrations/20260516_profiles_and_rls.sql`
   - Click Run
   - Crea tablas `profiles`, triggers, RLS policies

2. **Crear tu usuario admin**:
   - Supabase Dashboard → Authentication → Users → Add user
   - Email: tu email
   - Password: la que quieras
   - Marca **"Auto Confirm User"**
   - SQL: `update profiles set role = 'super' where email = 'tu@email.com';`

3. **Desplegar Edge Functions Stripe**:
   ```
   npx supabase functions deploy create-payment-intent --no-verify-jwt
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   ```

4. **Configurar secrets en Supabase**:
   - Dashboard → Project Settings → Edge Functions → Secrets
   - Añade:
     - `STRIPE_SECRET_KEY` = sk_live_...
     - `STRIPE_WEBHOOK_SECRET` = whsec_... (del webhook live en Stripe Dashboard)
     - `PRODUCTS_JSON` = JSON con array de productos (ver abajo)
     - `TIMEZONE` = `America/Bogota` (opcional, default)

5. **PRODUCTS_JSON** debe contener tu catálogo. Ejemplo:
   ```json
   [
     {"id":"coaching-individual","title":"Sesión Individual","basePrice":50},
     {"id":"coaching-3","title":"Paquete 3 Sesiones","basePrice":140},
     {"id":"coaching-5","title":"Paquete 5 Sesiones","basePrice":210},
     {"id":"marca-esencial","title":"Tu Marca con Huella","basePrice":350},
     {"id":"marca-pro","title":"Tu Marca con Huella PRO","basePrice":870},
     {"id":"marca-360","title":"Tu Marca con Huella 360","basePrice":1900},
     {"id":"llc-estructura","title":"Estructura Global","basePrice":1175},
     {"id":"llc-acompanamiento","title":"Acompañamiento Estratégico LLC","basePrice":1175},
     {"id":"impulso-starter","title":"Impulso 360 Starter","basePrice":770},
     {"id":"impulso-pro","title":"Impulso 360 PRO","basePrice":1497},
     {"id":"impulso-elite","title":"Impulso 360 Elite","basePrice":2197},
     {"id":"test-1usd","title":"Producto de prueba","basePrice":1}
   ]
   ```

6. **Actualizar webhook URL en Stripe** (en Live mode):
   ```
   https://tuproyecto.supabase.co/functions/v1/stripe-webhook
   ```

## 🚀 Build y deploy (cada vez que cambies algo)

### 1. Build local

```powershell
npm install      # solo la primera vez o cuando cambien dependencias
npm run build    # genera dist/
```

Se crea la carpeta `dist/` con:
- `index.html`
- `assets/index-XXXX.js` (todo el JavaScript)
- `assets/index-XXXX.css` (todo el CSS)
- `.htaccess` (configuración Apache)
- Tus imágenes (logo-h.png, corazon-elefante.jpg, etc.)

### 2. Subir a IONOS por SFTP

**Datos de conexión** (de tu screenshot anterior):
- **Host**: `access-5020016280.webspace-host.com`
- **Usuario**: `su1189125` (o el tuyo)
- **Puerto**: `22`
- **Protocolo**: SFTP

**Cliente recomendado**: [FileZilla](https://filezilla-project.org/) (gratis).

**Pasos**:
1. Abre FileZilla
2. **Sitio → Administrar sitios → Nuevo sitio**
3. Configura con los datos de arriba
4. Conecta
5. En el panel derecho navega a `/web/` (o donde quieras alojar)
6. **Borra todo lo que haya** dentro de `/web/`
7. **Arrastra el contenido de `dist/`** (no la carpeta, su contenido) al panel derecho
8. Espera a que termine la subida (~1-2 min según tamaño)

### 3. Configurar dominio en IONOS

1. IONOS panel → Dominios y SSL → tu dominio
2. Apuntar al directorio `/web/` (o donde subiste el dist)
3. SSL: activar Let's Encrypt (gratis, automático)
4. Esperar 5-15 min a propagación

### 4. Verificar

- `https://tu-dominio.com` → debe cargar la home
- `https://tu-dominio.com/historia` → debe cargar (no 404)
- `https://tu-dominio.com/admin` → debe redirigir a `/login`
- Login con tu email/password → debe entrar al panel

## 🛠 Comandos útiles

```powershell
npm run dev          # servidor local en http://localhost:3000
npm run build        # build de producción a dist/
npm run preview      # ver el build localmente
npm run typecheck    # verificar TypeScript
```

## 🔄 Workflow diario

1. Editas código localmente
2. `npm run dev` para probarlo
3. Cuando esté bien: `npm run build`
4. SFTP de `dist/*` a IONOS
5. Refresh con Ctrl+Shift+R

## ⚠️ Problemas comunes

### "Pagos no funcionan"
- Verifica que las Edge Functions están desplegadas: `npx supabase functions list`
- Verifica los secrets en Supabase Dashboard
- Verifica que el webhook URL en Stripe apunta a tu Supabase Edge Function (no a Vercel)

### "No puedo entrar al admin"
- Verifica que existe tu fila en `profiles` con `role = 'super'`
- Verifica que en Supabase Auth tu user está confirmado (no en pending)
- Limpia localStorage del navegador y vuelve a probar

### "404 al refrescar /admin"
- El `.htaccess` no se subió o IONOS no tiene `mod_rewrite` activado
- Verifica que `.htaccess` está dentro de `/web/`
- Si IONOS bloquea `.htaccess`, contacta soporte

### "Las imágenes no cargan"
- Verifica que subiste TODOS los archivos de `dist/` (incluyendo subcarpetas como `assets/`)
- Verifica permisos en IONOS (644 para archivos, 755 para directorios)
