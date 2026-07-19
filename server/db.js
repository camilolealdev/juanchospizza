import pg from 'pg';
import { runMigrations } from './migrate.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  max: parseInt(process.env.PG_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '5000', 10),
  allowExitOnIdle: true,
});

export async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        "categoryId" TEXT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        "basePrice" INTEGER,
        type TEXT,
        image TEXT,
        tiempo INTEGER,
        popularidad INTEGER,
        vegetariano BOOLEAN,
        "isPremium" BOOLEAN,
        exclusiva BOOLEAN,
        subcategory TEXT
      )
    `);

    // Tamaños de pizza -- usados tanto por el menú fijo (sabores completos,
    // sección "Pizza") como por el armador "Crea tu pizza" (base + N
    // ingredientes incluidos, extras a precio_extra por ingrediente). precio
    // es el precio ABSOLUTO del tamaño, no un delta -- distinto de
    // menu_variants (que sí es delta) porque acá no hay "producto base" del
    // cual partir, el tamaño ES el precio.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pizza_sizes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio INTEGER NOT NULL,
        incluidos INTEGER NOT NULL,
        porciones INTEGER,
        activo BOOLEAN DEFAULT TRUE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        precio_extra INTEGER,
        categoria TEXT,
        vegetariano BOOLEAN,
        vegano BOOLEAN,
        premium BOOLEAN,
        dulce BOOLEAN,
        disponible BOOLEAN,
        "defaultIng" BOOLEAN
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        "orderNumber" TEXT,
        "customerName" TEXT,
        address TEXT,
        items JSON,
        total INTEGER,
        status TEXT,
        "createdAt" TIMESTAMPTZ,
        "estimatedTime" INTEGER,
        "paymentMethod" TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        discount INTEGER,
        status TEXT,
        reach INTEGER,
        conversions INTEGER,
        budget INTEGER
      )
    `);

    // === GASTROPRO CRM TABLES ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        notas TEXT,
        "totalCompras" INTEGER DEFAULT 0,
        "totalGastado" INTEGER DEFAULT 0,
        "frecuenciaCompra" INTEGER DEFAULT 0,
        "ultimaCompra" TIMESTAMPTZ,
        creado TIMESTAMPTZ DEFAULT NOW(),
        vip BOOLEAN DEFAULT FALSE,
        puntos INTEGER DEFAULT 0,
        nivel TEXT DEFAULT 'bronce',
        tags JSON DEFAULT '[]'::json,
        estado TEXT DEFAULT 'activo',
        cumpleanos DATE
      )
    `);
    // Evita clientes duplicados por teléfono (orders.js resuelve el cliente
    // por telefono con LIMIT 1 sin ORDER BY -- un duplicado fragmenta puntos
    // de lealtad y puede pegar un pedido al cliente equivocado). Parcial
    // porque telefono es nullable.
    await pool.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_telefono ON clients(telefono) WHERE telefono IS NOT NULL'
    );

    // La columna clientId nunca existió en el esquema original de orders;
    // se agrega aquí (después de clients, a la que referencia) vía ALTER
    // TABLE idempotente para que también aplique a bases ya existentes.
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "clientId" TEXT REFERENCES clients(id)');
    // Necesaria para notificaciones push y reseñas (ambas se identifican por
    // teléfono, ya que no existe sistema de cuentas de cliente).
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "customerPhone" TEXT');

    // Separa el estado de pago del estado de cocina/entrega. 'cash'/'card'
    // (pago contra-entrega) se marcan 'paid' de inmediato -- no hay nada que
    // confirmar por adelantado. Los métodos online (bold/mercadopago/wompi)
    // arrancan en 'pending' y solo el webhook del proveedor los pasa a
    // 'paid'/'failed', nunca el cliente.
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'pending'`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentProviderRef" TEXT`);

    // Fundación multi-sede: 'nemocon' | 'zipaquira'. Default a 'nemocon' para
    // no romper pedidos/filas existentes que nunca conocieron el concepto de sede.
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS "locationId" TEXT DEFAULT 'nemocon'`);

    // UNIQUE constraints for data integrity
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number ON orders("orderNumber")');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        categoria TEXT,
        "stockActual" INTEGER DEFAULT 0,
        "stockMinimo" INTEGER DEFAULT 10,
        "stockMaximo" INTEGER DEFAULT 100,
        unidad TEXT DEFAULT 'unidad',
        "costoUnitario" INTEGER DEFAULT 0,
        proveedor TEXT,
        lote TEXT,
        "fechaVencimiento" TIMESTAMPTZ,
        ubicacion TEXT,
        activo BOOLEAN DEFAULT TRUE
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_inventory_nombre ON inventory_items(nombre)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        "itemId" TEXT,
        tipo TEXT,
        cantidad INTEGER,
        "saldoAnterior" INTEGER,
        "saldoNuevo" INTEGER,
        motivo TEXT,
        referencia TEXT,
        creado TIMESTAMPTZ DEFAULT NOW(),
        usuario TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        "productoId" TEXT,
        porciones INTEGER DEFAULT 1,
        "costoTotal" INTEGER DEFAULT 0,
        instrucciones TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY,
        "recipeId" TEXT REFERENCES recipes(id),
        "itemId" TEXT REFERENCES inventory_items(id),
        nombre TEXT,
        cantidad REAL DEFAULT 0,
        unidad TEXT DEFAULT 'unidad',
        costo INTEGER DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        categoria TEXT,
        descripcion TEXT,
        monto INTEGER,
        fecha TIMESTAMPTZ DEFAULT NOW(),
        metodo TEXT,
        proveedor TEXT,
        factura TEXT,
        notas TEXT,
        recurrente BOOLEAN DEFAULT FALSE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_points (
        id TEXT PRIMARY KEY,
        "clientId" TEXT,
        puntos INTEGER,
        concepto TEXT,
        referencia TEXT,
        creado TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_rewards (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        "puntosCosto" INTEGER,
        tipo TEXT,
        valor INTEGER,
        vigente INTEGER DEFAULT 1
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_variants (
        id TEXT PRIMARY KEY,
        "productoId" TEXT,
        nombre TEXT,
        "precioModificador" INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT TRUE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_combos (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        productos JSON,
        "precioTotal" INTEGER,
        ahorro INTEGER DEFAULT 0,
        imagen TEXT,
        activo BOOLEAN DEFAULT TRUE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_promotions (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        tipo TEXT,
        valor INTEGER,
        "productoId" TEXT,
        "categoriaId" TEXT,
        "montoMinimo" INTEGER,
        inicia TIMESTAMPTZ,
        termina TIMESTAMPTZ,
        activo BOOLEAN DEFAULT TRUE,
        usado INTEGER DEFAULT 0,
        limite INTEGER DEFAULT 100
      )
    `);
    await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        "orderId" TEXT REFERENCES orders(id),
        "clientPhone" TEXT,
        "clientName" TEXT,
        rating INTEGER NOT NULL,
        comment TEXT,
        status TEXT DEFAULT 'pending',
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )`);
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_orderId ON reviews("orderId")');

    // ── Ley 1581/2012 (Habeas Data, Colombia) ────────────────────────
    // Captura evidencia de consentimiento expreso. Dec. 1377/2013 obliga
    // al responsable a conservar prueba del consentimiento y de cada
    // revocación. Diseño: una fila viva en `clients` (último estado) +
    // log histórico en `consent_eventos` para auditoría SIC.
    await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "dataTreatmentAuthorized" BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "marketingAuthorized" BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "consentAt" TIMESTAMPTZ');
    await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "consentIp" VARCHAR(45)');
    await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "consentUserAgent" TEXT');
    await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "consentVersion" VARCHAR(20)');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consent_eventos (
        id TEXT PRIMARY KEY,
        "clientId" TEXT REFERENCES clients(id),
        "consentType" TEXT NOT NULL,
        granted BOOLEAN NOT NULL,
        ip VARCHAR(45),
        "userAgent" TEXT,
        source TEXT DEFAULT 'web',
        path TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_consent_eventos_clientId ON consent_eventos("clientId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_consent_eventos_created ON consent_eventos(created_at)');

    // ── Derechos ARCO (Art. 14-15 Ley 1581) ───────────────────────────
    // Cada solicitud de consulta / rectificación / supresión / reclamo
    // queda registrada con timestamps para evidenciar plazo de 10 días
    // hábiles de respuesta (Art. 15). El estado permite ver el backlog
    // desde el CRM sin ir a buscar el correo/WhatsApp.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS derechos_solicitudes (
        id TEXT PRIMARY KEY,
        "clientId" TEXT REFERENCES clients(id),
        tipo TEXT NOT NULL,
        descripcion TEXT,
        "identificador" TEXT,
        estado TEXT DEFAULT 'pendiente',
        "respuesta" TEXT,
        "respondedBy" TEXT,
        "respondedAt" TIMESTAMPTZ,
        "ipOrigen" VARCHAR(45),
        "userAgent" TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_derechos_clientId ON derechos_solicitudes("clientId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_derechos_estado ON derechos_solicitudes(estado)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_derechos_created ON derechos_solicitudes(created_at)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        phone TEXT,
        "clientId" TEXT REFERENCES clients(id),
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Roster de staff (múltiples logins por rol, ej. varios cocineros por
    // turno en cada sede). Ya está conectada al login real -- server/auth.js
    // consulta esta tabla directamente (username/PIN, password+2FA para
    // super admin). Ver server/auth.js `authenticate()`.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        role TEXT NOT NULL,
        "pinHash" TEXT NOT NULL,
        salt TEXT NOT NULL,
        "locationId" TEXT,
        activo BOOLEAN DEFAULT TRUE,
        creado TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        "locationId" TEXT NOT NULL,
        status TEXT DEFAULT 'closed',
        "openingCash" INTEGER DEFAULT 0,
        "closingCash" INTEGER,
        "expectedCash" INTEGER,
        difference INTEGER,
        "openedBy" TEXT REFERENCES employees(id),
        "closedBy" TEXT,
        "openedAt" TIMESTAMPTZ DEFAULT NOW(),
        "closedAt" TIMESTAMPTZ,
        notas TEXT
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shifts_locationId_status ON shifts("locationId", status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shifts_openedBy ON shifts("openedBy")');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders("createdAt")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_clientId ON orders("clientId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_clients_estado ON clients(estado)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_inventory_categoria ON inventory_items(categoria)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipeId ON recipe_ingredients("recipeId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_fecha ON expenses(fecha)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_menu_promotions_activo ON menu_promotions(activo)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_locationId ON orders("locationId")');

    // === DINING TABLES ===
    // Must be created before COMANDAS below -- comandas.tableId FKs to it,
    // and CREATE TABLE ... REFERENCES a not-yet-existing table fails,
    // aborting the rest of this sequential await chain (silently dropping
    // every table defined after the failure point, not just this one).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dining_tables (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        capacity INTEGER DEFAULT 4,
        area TEXT DEFAULT 'salon',
        "locationId" TEXT DEFAULT 'nemocon',
        status TEXT DEFAULT 'available',
        notes TEXT,
        qr_code TEXT,
        active BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_name_location ON dining_tables (name, "locationId")
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tables_location ON dining_tables("locationId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tables_status ON dining_tables(status)');

    // === COMANDAS (mesa-based orders for dine-in) ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comandas (
        id TEXT PRIMARY KEY,
        "tableId" TEXT REFERENCES dining_tables(id),
        "waiterName" TEXT,
        status TEXT DEFAULT 'open',
        "guestCount" INTEGER DEFAULT 1,
        notes TEXT,
        total INTEGER DEFAULT 0,
        "openedAt" TIMESTAMPTZ DEFAULT NOW(),
        "closedAt" TIMESTAMPTZ,
        "locationId" TEXT DEFAULT 'nemocon'
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comanda_items (
        id TEXT PRIMARY KEY,
        "comandaId" TEXT REFERENCES comandas(id),
        "productId" TEXT,
        "productName" TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        "unitPrice" INTEGER DEFAULT 0,
        subtotal INTEGER DEFAULT 0,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_comandas_tableId ON comandas("tableId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comandas_status ON comandas(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comanda_items_comandaId ON comanda_items("comandaId")');

    // === PROCUREMENT / PURCHASE ORDERS ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        "orderNumber" TEXT,
        proveedor TEXT,
        "fechaSolicitud" TIMESTAMPTZ DEFAULT NOW(),
        "fechaEntrega" TIMESTAMPTZ,
        items JSON DEFAULT '[]'::json,
        total INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pendiente',
        notas TEXT,
        "createdBy" TEXT,
        "locationId" TEXT DEFAULT 'nemocon'
      )
    `);
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders("orderNumber")');

    // === INVOICES (DIAN base structure) ===
    // Ver docs/DIAN_MODULE_STATUS.md para estado completo de la integración.
    // Campos marcados como [MANUAL] deben completarse antes de enviar a DIAN.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        "orderId" TEXT REFERENCES orders(id),
        "invoiceNumber" TEXT,
        "tipoDocumento" TEXT DEFAULT 'factura',
        cufe TEXT,
        xml TEXT,
        pdf_url TEXT,
        status TEXT DEFAULT 'pending',
        "dianResponse" JSON,
        "emisorInfo" JSON DEFAULT '{}'::json,
        "receptorInfo" JSON DEFAULT '{}'::json,
        notes TEXT,
        "fechaVencimiento" TIMESTAMPTZ,
        "tipoOperacion" TEXT DEFAULT '10',
        moneda TEXT DEFAULT 'COP',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "locationId" TEXT DEFAULT 'nemocon'
      )
    `);

    // === CREDIT / DEBIT NOTES ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_notes (
        id TEXT PRIMARY KEY,
        "invoiceId" TEXT REFERENCES invoices(id),
        "tipoNota" TEXT DEFAULT 'credito',
        motivo TEXT,
        monto INTEGER DEFAULT 0,
        items JSON DEFAULT '[]'::json,
        status TEXT DEFAULT 'pending',
        xml TEXT,
        cude TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "createdBy" TEXT
      )
    `);

    // Agregar columnas nuevas a invoices para bases existentes
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "emisorInfo" JSON DEFAULT \'{}\'::json');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "receptorInfo" JSON DEFAULT \'{}\'::json');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "fechaVencimiento" TIMESTAMPTZ');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "tipoOperacion" TEXT DEFAULT \'10\'');
    await pool.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'COP'");

    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_orderId ON invoices("orderId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_credit_notes_invoiceId ON credit_notes("invoiceId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status)');

    // === QR MENU config ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qr_menu_config (
        id TEXT PRIMARY KEY,
        "locationId" TEXT DEFAULT 'nemocon',
        title TEXT DEFAULT 'Menú',
        "showPrices" BOOLEAN DEFAULT TRUE,
        "showImages" BOOLEAN DEFAULT TRUE,
        "showCombos" BOOLEAN DEFAULT TRUE,
        "showPromotions" BOOLEAN DEFAULT TRUE,
        categories JSON DEFAULT '[]'::json,
        active BOOLEAN DEFAULT TRUE,
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // === CASH REGISTER ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cash_register (
        id TEXT PRIMARY KEY,
        "locationId" TEXT DEFAULT 'nemocon',
        "openedAt" TIMESTAMPTZ DEFAULT NOW(),
        "closedAt" TIMESTAMPTZ,
        "openedBy" TEXT,
        "closedBy" TEXT,
        "initialAmount" INTEGER DEFAULT 0,
        "expectedAmount" INTEGER DEFAULT 0,
        "finalAmount" INTEGER,
        difference INTEGER,
        status TEXT DEFAULT 'open',
        notes TEXT
      )
    `);

    // === DIGITURNO — Turnos digitales para pedidos en local ===
    // Separa los pedidos de delivery (que tienen su propio flujo en orders)
    // de los pedidos de consumo en el local, que se gestionan por turno.
    // Cada ticket tiene un número secuencial por sede.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS digiturno_tickets (
        id TEXT PRIMARY KEY,
        "ticketNumber" INTEGER NOT NULL,
        "orderType" TEXT DEFAULT 'dine-in',
        status TEXT DEFAULT 'waiting',
        "locationId" TEXT DEFAULT 'nemocon',
        "tableId" TEXT REFERENCES dining_tables(id),
        "tableName" TEXT,
        "customerName" TEXT,
        "guestCount" INTEGER DEFAULT 1,
        source TEXT DEFAULT 'local',
        items JSON DEFAULT '[]'::json,
        total INTEGER DEFAULT 0,
        notes TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "calledAt" TIMESTAMPTZ,
        "completedAt" TIMESTAMPTZ
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_digiturno_status ON digiturno_tickets(status)');
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_digiturno_locationId_status ON digiturno_tickets("locationId", status)'
    );
    await pool.query('CREATE INDEX IF NOT EXISTS idx_digiturno_createdAt ON digiturno_tickets("createdAt")');
    // UNIQUE constraint para evitar race condition en números secuenciales.
    // Si dos POSTs simultáneos calculan el mismo MAX+1, el segundo INSERT
    // falla con unique_violation (código 23505) y el retry loop en la ruta
    // lo reintenta automáticamente con el siguiente número disponible.
    await pool.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_digiturno_number_location ON digiturno_tickets("locationId", "ticketNumber")'
    );

    // === TIPS ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tips (
        id TEXT PRIMARY KEY,
        "orderId" TEXT REFERENCES orders(id),
        amount INTEGER NOT NULL,
        method TEXT DEFAULT 'cash',
        "waiterName" TEXT,
        "locationId" TEXT DEFAULT 'nemocon',
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('✅ Database initialized with GastroPro CRM tables');

    // ── Migraciones versionadas ────────────────────────────────
    // Después de crear/actualizar el esquema base, ejecuta las
    // migraciones numeradas que agregan datos semilla, columnas
    // adicionales y tablas auxiliares (ver server/migrate.js).
    await runMigrations(pool);
  } catch (error) {
    console.error('❌ DB init error:', error.message);
  }
}
