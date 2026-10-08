import React, { useMemo, useState } from 'react';
import { UserRole } from '../../types';

type RoleTab = 'admin' | 'operator' | 'repartidor' | 'marketing';

interface GuiaModule {
  id: string;
  title: string;
  moduleKey?: string;
  searchText: string;
  defaultOpen?: boolean;
  body: React.ReactNode;
}

interface GuiaSection {
  label: string;
  modules: GuiaModule[];
}

interface GuiaRole {
  tab: RoleTab;
  title: string;
  intro: React.ReactNode;
  chips: { text: string; tone?: 'basil' }[];
  sections: GuiaSection[];
}

const roleTabFromUserRole = (role: UserRole): RoleTab => {
  switch (role) {
    case UserRole.OPERATOR:
      return 'operator';
    case UserRole.REPARTIDOR:
      return 'repartidor';
    case UserRole.MARKETING:
      return 'marketing';
    default:
      return 'admin';
  }
};

const Chip: React.FC<React.PropsWithChildren<{ tone?: 'basil' }>> = ({ tone, children }) => (
  <span
    className={`font-mono text-[11px] px-2.5 py-1 rounded-md font-bold tracking-wide ${
      tone === 'basil' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-orange-900/30 text-orange-400'
    }`}
  >
    {children}
  </span>
);

const Callout: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="border-l-2 border-orange-600 bg-orange-900/15 rounded-r-xl px-4 py-3 text-sm text-stone-300 mt-3">
    {children}
  </div>
);

const Key: React.FC<React.PropsWithChildren> = ({ children }) => (
  <span className="font-mono text-[11px] text-stone-600 ml-2">{children}</span>
);

const ROLES: GuiaRole[] = [
  {
    tab: 'admin',
    title: 'Admin / Super Admin',
    chips: [{ text: 'Google + PIN' }, { text: 'Todas las sedes', tone: 'basil' }],
    intro: (
      <>
        <p>
          Ve y puede tocar los 20 módulos del sistema, en las dos sedes (Nemocón y Zipaquirá), con un selector para
          cambiar entre ellas.
        </p>
        <p>
          <strong className="text-stone-200">Super Admin</strong> no es un rol distinto en el sistema — es una cuenta
          Admin marcada con un candado extra: para entrar necesita, además del PIN, una contraseña (o el login con
          Google + PIN como segundo factor). El resto de los módulos y permisos son idénticos a cualquier otro Admin.
        </p>
      </>
    ),
    sections: [
      {
        label: 'Catálogo y compras',
        modules: [
          {
            id: 'a-menu',
            title: 'Menú',
            moduleKey: 'menu',
            defaultOpen: true,
            searchText: 'menu productos variantes tamanos combos promociones csv qr',
            body: (
              <>
                <p>
                  CRUD completo del catálogo: productos, variantes, tamaños de pizza, combos y promociones, en 6
                  pestañas — más una herramienta de menú-QR y un import masivo por CSV.
                </p>
                <p>
                  <strong className="text-stone-200">No hay un menú por sede.</strong> Es un solo catálogo compartido
                  entre Nemocón y Zipaquirá — un cambio de precio o de disponibilidad aplica a las dos sedes al mismo
                  tiempo, de inmediato.
                </p>
                <Callout>
                  <strong className="text-orange-400">Ojo con WhatsApp:</strong> el agente lee el menú en vivo en cada
                  consulta, así que un cambio de precio se refleja ahí casi de inmediato. El detalle completo de cómo se
                  conecta está más abajo, en &ldquo;El agente de WhatsApp (n8n)&rdquo;.
                </Callout>
              </>
            ),
          },
          {
            id: 'a-inventario',
            title: 'Inventario',
            moduleKey: 'inventario',
            searchText: 'inventario stock alertas critico entradas salidas recetas',
            body: (
              <p>
                Stock de ingredientes con alertas automáticas OK / Alerta / Crítico según el mínimo configurado,
                historial de entradas/salidas, categorías propias y recetas (qué ingredientes consume cada producto,
                para costeo).
              </p>
            ),
          },
          {
            id: 'a-compras',
            title: 'Compras',
            moduleKey: 'compras',
            searchText: 'compras ordenes proveedores',
            body: (
              <p>
                Órdenes de compra a proveedores por sede: proveedor, fecha de entrega, líneas de producto, y seguimiento
                de estado.
              </p>
            ),
          },
        ],
      },
      {
        label: 'Clientes y marketing',
        modules: [
          {
            id: 'a-clientes',
            title: 'Clientes',
            moduleKey: 'clientes',
            searchText: 'clientes fidelizacion bronce plata oro platino historial',
            body: (
              <p>Directorio de clientes con nivel de fidelización (Bronce/Plata/Oro/Platino) e historial de compras.</p>
            ),
          },
          {
            id: 'a-fidelizacion',
            title: 'Fidelización',
            moduleKey: 'fidelizacion',
            searchText: 'fidelizacion niveles descuentos beneficios',
            body: (
              <p>Configuración del programa de lealtad: umbrales de cada nivel, descuentos y beneficios asociados.</p>
            ),
          },
          {
            id: 'a-campanas',
            title: 'Campañas',
            moduleKey: 'campanas',
            searchText: 'campanas marketing flash segmento rappipromo descuento presupuesto conversiones',
            body: (
              <p>
                CRUD de campañas de marketing (flash, por segmento, Rappipromo), con % de descuento, presupuesto, estado
                y una fecha de activación automática opcional. Incluye gráfico de conversiones por campaña.
              </p>
            ),
          },
          {
            id: 'a-reviews',
            title: 'Reseñas',
            moduleKey: 'reviews',
            searchText: 'resenas reviews moderacion aprobar rechazar',
            body: <p>Moderación de reseñas de clientes antes de publicarlas: pendientes, aprobadas, rechazadas.</p>,
          },
          {
            id: 'a-derechos',
            title: 'Derechos ARCO',
            moduleKey: 'derechos',
            searchText: 'derechos arco datos personales ley 1581',
            body: (
              <p>
                Solicitudes de protección de datos (Ley 1581): consulta, rectificación, supresión, reclamo. Ventana
                legal de 10 días hábiles para responder; queda registrado quién respondió y cuándo.
              </p>
            ),
          },
        ],
      },
      {
        label: 'Operación diaria',
        modules: [
          {
            id: 'a-turnos',
            title: 'Turnos',
            moduleKey: 'turnos',
            searchText: 'turnos apertura cierre caja esperada',
            body: (
              <p>
                Igual que ve Cocina/Cajero, pero para todas las sedes — ver la pestaña de Cocina/Cajero para el detalle.
              </p>
            ),
          },
          {
            id: 'a-caja',
            title: 'Caja',
            moduleKey: 'caja',
            searchText: 'caja registradora propinas historial',
            body: (
              <p>
                Igual que Cocina/Cajero, para todas las sedes — incluye el historial de cajas y las propinas
                registradas.
              </p>
            ),
          },
          {
            id: 'a-mesas',
            title: 'Mesas',
            moduleKey: 'mesas',
            searchText: 'mesas salon terraza privado barra estado',
            body: (
              <p>
                Plano de mesas por zona (Salón, Terraza, Privado, Barra) con estado
                (disponible/ocupada/reservada/limpieza/mantenimiento).
              </p>
            ),
          },
          {
            id: 'a-pedidos',
            title: 'Pedidos',
            moduleKey: 'pedidos',
            searchText: 'pedidos kanban',
            body: <p>El mismo kanban que ve Cocina, con visibilidad de las dos sedes a la vez.</p>,
          },
          {
            id: 'a-comandas',
            title: 'Comandas',
            moduleKey: 'comandas',
            searchText: 'comandas salon mesas',
            body: <p>Gestión de mesas en salón — ver detalle en la pestaña Cocina/Cajero.</p>,
          },
          {
            id: 'a-digiturno',
            title: 'Digiturno',
            moduleKey: 'digiturno',
            searchText: 'digiturno cola turnos numerados cocina',
            body: <p>Cola de turnos numerados en cocina, separada del kanban de Pedidos.</p>,
          },
        ],
      },
      {
        label: 'Finanzas',
        modules: [
          {
            id: 'a-finanzas',
            title: 'Finanzas',
            moduleKey: 'finanzas',
            searchText: 'finanzas gastos categoria nomina ingredientes',
            body: (
              <p>
                Gastos por categoría (ingredientes, nómina, servicios, marketing, mantenimiento, transporte, empaques,
                varios) con gráfico de desglose y resumen financiero.
              </p>
            ),
          },
          {
            id: 'a-facturacion',
            title: 'Facturación',
            moduleKey: 'facturacion',
            searchText: 'facturacion dian xml cufe firma notas credito',
            body: (
              <p>
                Facturación electrónica DIAN: crear/listar facturas y notas crédito por sede, revisar el XML, y el flujo
                manual de firma con CUFE.
              </p>
            ),
          },
          {
            id: 'a-pagos',
            title: 'Pagos',
            moduleKey: 'pagos',
            searchText: 'pagos bold pasarela claves',
            body: (
              <p>
                Tablero de estado de las pasarelas de pago (hoy, solo Bold está activa) — muestra si las claves están
                configuradas, nunca el valor de la clave.
              </p>
            ),
          },
        ],
      },
      {
        label: 'Sistema',
        modules: [
          {
            id: 'a-empleados',
            title: 'Empleados',
            moduleKey: 'empleados',
            searchText: 'empleados pin email google super admin',
            body: (
              <>
                <p>
                  Alta y edición del personal: nombre, rol, sede, PIN de 4 dígitos. Para que alguien pueda entrar con
                  Google hay que cargarle su email — ese campo hoy se actualiza directo en la base de datos, no desde
                  este formulario todavía.
                </p>
                <p>
                  El flag de Super Admin tampoco se otorga desde este formulario — es deliberado, para que nadie pueda
                  auto-asignarse ese nivel desde la interfaz.
                </p>
              </>
            ),
          },
          {
            id: 'a-notificaciones',
            title: 'Notificaciones',
            moduleKey: 'notificaciones',
            searchText: 'notificaciones email push webhooks prueba',
            body: (
              <p>
                Estado de los canales de email/push/webhooks, con botones para disparar una prueba real sin exponer
                ninguna clave.
              </p>
            ),
          },
          {
            id: 'a-reportes',
            title: 'Reportes',
            moduleKey: 'reportes',
            searchText: 'reportes ventas inventario marketing fidelizacion finanzas',
            body: <p>Reportes de ventas, inventario, marketing, fidelización y finanzas sobre un rango de fechas.</p>,
          },
        ],
      },
      {
        label: 'El agente de WhatsApp (n8n)',
        modules: [
          {
            id: 'a-n8n',
            title: 'Cómo se conecta el menú con WhatsApp',
            defaultOpen: true,
            searchText: 'n8n whatsapp agente menu sede catalogo guiado botones sabores porcion ventas',
            body: (
              <>
                <p>
                  El bot de WhatsApp es un flujo de n8n que le habla a la misma API pública que usa la tienda web — no
                  tiene ningún acceso privilegiado de Admin, a propósito. Cada vez que alguien pregunta el menú, lo lee
                  en vivo (<code className="font-mono text-xs bg-stone-900 px-1.5 py-0.5 rounded">/api/menu</code> y{' '}
                  <code className="font-mono text-xs bg-stone-900 px-1.5 py-0.5 rounded">/api/pizza-sizes</code>); solo
                  usa una copia guardada si esa lectura en vivo falla, y en ese caso avisa que el local confirma precio
                  y disponibilidad. El total de cualquier pedido <strong className="text-stone-200">siempre</strong> lo
                  calcula GastroPro al crear la orden — el bot nunca inventa ni confirma un precio final por su cuenta.
                </p>
                <p>
                  <strong className="text-stone-200">Dos formas de pedir, no una.</strong> El cliente puede escribir
                  libremente y charlar con el agente de IA, o tocar{' '}
                  <strong className="text-stone-200">Hacer pedido</strong> (o escribir &ldquo;quiero pedir&rdquo;), que
                  lo lleva por un menú de botones paso a paso — categoría, producto, tamaño, sabor(es), cantidad,
                  domicilio o recoge, dirección, teléfono y forma de pago, con un resumen final para confirmar — sin IA
                  de por medio. El propio agente hoy recomienda ese camino de botones como el más rápido; solo toma el
                  pedido él mismo por chat si el cliente insiste en escribirlo todo.
                </p>
                <p>
                  <strong className="text-stone-200">Tamaños y sabores combinados.</strong> Los tamaños oficiales de
                  pizza son 4: Small (1 sabor incluido), Junior (2), Mediana (2) y Familiar (3) — combinar sabores
                  dentro de ese límite no cuesta extra, el precio es el del tamaño. Ya no existe un tamaño
                  &ldquo;Personal&rdquo; (se quitó porque no está publicado en la web). La porción individual es un
                  producto aparte, sin tamaño, de un solo sabor.
                </p>
                <Callout>
                  <strong className="text-orange-400">Registro de ventas, con un límite real:</strong> cada pedido
                  cerrado por el camino de botones queda guardado automáticamente (fecha, pedido, sede, producto,
                  sabores, tamaño, cantidad, precio) en una tabla interna de n8n — no es Google Sheets, y hoy no se ve
                  desde el CRM. Importante: solo registra los pedidos hechos por botones; los que el cliente completa
                  charlando directo con el agente de IA <strong className="text-orange-400">no</strong> quedan ahí
                  todavía — es un registro parcial, no un reporte de ventas completo.
                </Callout>
                <p>
                  El número de WhatsApp es uno solo para las dos sedes: el catálogo que ve el cliente es el mismo sin
                  importar a qué sede le vaya a llegar el pedido — la sede solo se usa para decidir a dónde se enruta la
                  entrega, nunca para mostrar un menú o precio distinto.
                </p>
              </>
            ),
          },
        ],
      },
    ],
  },
  {
    tab: 'operator',
    title: 'Cocina / Cajero',
    chips: [{ text: 'Google sin PIN' }, { text: 'Solo tu sede', tone: 'basil' }],
    intro: (
      <>
        <p>
          Es un solo rol en el sistema (
          <code className="font-mono text-xs bg-stone-900 px-1.5 py-0.5 rounded">OPERATOR</code>) — lo que cambia es la
          estación donde te paras, no el permiso. Ves solo los pedidos, mesas, turnos y caja de{' '}
          <strong className="text-stone-200">tu propia sede</strong>; pedir o adivinar el ID de la otra sede no
          funciona, el servidor lo bloquea.
        </p>
        <Callout>
          Vas a abrir <strong className="text-orange-400">dos cosas</strong> al empezar el día, no una: un{' '}
          <strong className="text-orange-400">Turno</strong> y una <strong className="text-orange-400">Caja</strong>.
          Son sistemas separados que no se enlazan automáticamente entre sí — cerralos los dos al final del turno.
        </Callout>
      </>
    ),
    sections: [
      {
        label: 'Rituales del día',
        modules: [
          {
            id: 'o-turnos',
            title: 'Turnos',
            moduleKey: 'turnos',
            defaultOpen: true,
            searchText: 'turnos abrir cerrar efectivo sobrante faltante',
            body: (
              <>
                <p>
                  Para empezar: entrá a Turnos, escribí el efectivo con el que abrís y tocá{' '}
                  <strong className="text-stone-200">Abrir Turno</strong>. Si ya hay un turno abierto en tu sede, el
                  sistema no te deja abrir otro.
                </p>
                <p>
                  Para cerrar: contá el efectivo real, escribilo en{' '}
                  <strong className="text-stone-200">Cerrar Turno</strong> con una nota si hace falta, y confirmá. El
                  sistema compara tu efectivo contado contra lo esperado y te dice si cuadró exacto, hubo sobrante o
                  faltó.
                </p>
              </>
            ),
          },
          {
            id: 'o-caja',
            title: 'Caja',
            moduleKey: 'caja',
            defaultOpen: true,
            searchText: 'caja abrir cerrar propinas historial',
            body: (
              <p>
                Mismo ritual que Turnos — <strong className="text-stone-200">Abrir Caja</strong> con el monto inicial,{' '}
                <strong className="text-stone-200">Cerrar Caja</strong> con el monto contado al final. Dos pestañas:{' '}
                <strong className="text-stone-200">Historial</strong> (aperturas/cierres con la diferencia marcada en
                verde o rojo) y <strong className="text-stone-200">Propinas</strong> (total acumulado, por mesero si
                quedó registrado quién la recibió).
              </p>
            ),
          },
        ],
      },
      {
        label: 'Trabajar el pedido',
        modules: [
          {
            id: 'o-pedidos',
            title: 'Pedidos',
            moduleKey: 'pedidos',
            defaultOpen: true,
            searchText: 'pedidos kanban nuevos confirmados preparando listos sonido',
            body: (
              <>
                <p>
                  Un kanban de 4 columnas:{' '}
                  <strong className="text-stone-200">Nuevos → Confirmados → Preparando → Listos</strong>. Cada tarjeta
                  muestra los items, dirección, teléfono (tocás para llamar) y método de pago — un solo botón la pasa a
                  la siguiente columna.
                </p>
                <p>
                  Un pedido nuevo suena con una alerta de 3 tonos. Si se te corta la conexión en vivo, el sistema revisa
                  solo cada 30 segundos como respaldo — no vas a perder un pedido, puede tardar hasta ese tiempo en
                  aparecer.
                </p>
              </>
            ),
          },
          {
            id: 'o-comandas',
            title: 'Comandas (salón)',
            moduleKey: 'comandas',
            searchText: 'comandas mesa mesero items imprimir cerrar',
            body: (
              <>
                <p>
                  <strong className="text-stone-200">Nueva Comanda</strong>: elegís mesa, número de personas y mesero.
                  Dentro de la comanda abierta vas agregando items (producto, cantidad, precio). Podés imprimir la
                  comanda para cocina o el recibo para el cliente desde ahí mismo.
                </p>
                <p>
                  Para cerrarla: total final, método de pago y una nota opcional. Dos pestañas arriba:{' '}
                  <strong className="text-stone-200">Activas</strong> y{' '}
                  <strong className="text-stone-200">Cerradas</strong>.
                </p>
              </>
            ),
          },
          {
            id: 'o-digiturno',
            title: 'Digiturno',
            moduleKey: 'digiturno',
            searchText: 'digiturno tickets mesa local llevar timbre',
            body: (
              <p>
                Fila de tickets numerados (Mesa / Local / Para llevar) que avanzan de espera → preparando → listo →
                entregado. Suena un timbre cuando un ticket pasa a listo.
              </p>
            ),
          },
        ],
      },
      {
        label: 'Mantenimiento',
        modules: [
          {
            id: 'o-mesas',
            title: 'Mesas',
            moduleKey: 'mesas',
            searchText: 'mesas estado disponible ocupada reservada limpieza',
            body: (
              <p>
                Marcá el estado de cada mesa (disponible, ocupada, reservada, limpieza, mantenimiento). Hay un modo de
                selección múltiple para cambiar varias mesas de una.
              </p>
            ),
          },
          {
            id: 'o-inventario',
            title: 'Inventario',
            moduleKey: 'inventario',
            searchText: 'inventario stock entradas salidas alerta critico',
            body: (
              <p>
                Registrá entradas y salidas de stock con cantidad y motivo. El sistema marca solo cada ingrediente como
                OK, Alerta o Crítico según el mínimo configurado.
              </p>
            ),
          },
          {
            id: 'o-menu',
            title: 'Menú (solo lectura)',
            moduleKey: 'menu',
            searchText: 'menu precios consulta lectura',
            body: (
              <p>
                Podés consultar productos y precios vigentes mientras tomás un pedido. La edición del catálogo es solo
                para Admin.
              </p>
            ),
          },
        ],
      },
    ],
  },
  {
    tab: 'repartidor',
    title: 'Repartidor',
    chips: [{ text: 'Google sin PIN' }, { text: 'Solo tu sede', tone: 'basil' }],
    intro: (
      <p>
        El módulo más chico del sistema a propósito: solo necesitás ver qué entregar. Solo te aparecen los pedidos de tu
        propia sede.
      </p>
    ),
    sections: [
      {
        label: 'Tu pantalla',
        modules: [
          {
            id: 'r-pedidos',
            title: 'Pedidos',
            moduleKey: 'pedidos',
            defaultOpen: true,
            searchText: 'pedidos disponibles mis entregas tomar pedido entregado',
            body: (
              <>
                <p>Dos secciones:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong className="text-stone-200">Disponibles</strong> — pedidos listos que cualquiera puede tomar.
                    Tocás <strong className="text-stone-200">Tomar pedido</strong> y es tuyo; si otro repartidor lo tomó
                    un segundo antes, el sistema te avisa que ya no está disponible en vez de dejarte dos personas con
                    la misma entrega.
                  </li>
                  <li>
                    <strong className="text-stone-200">Mis entregas</strong> — lo que ya tomaste. Un botón te pasa de{' '}
                    <strong className="text-stone-200">Salir a entregar</strong> a{' '}
                    <strong className="text-stone-200">Marcar entregado</strong>.
                  </li>
                </ul>
                <p>Cada tarjeta trae la dirección y el teléfono del cliente con toque directo para llamar.</p>
              </>
            ),
          },
        ],
      },
    ],
  },
  {
    tab: 'marketing',
    title: 'Marketing',
    chips: [{ text: 'Google sin PIN' }, { text: 'Todas las sedes', tone: 'basil' }],
    intro: (
      <p>
        Reputación, campañas y cumplimiento de datos personales. No está limitado por sede — estas herramientas son
        transversales a todo el negocio.
      </p>
    ),
    sections: [
      {
        label: 'Tus módulos',
        modules: [
          {
            id: 'm-reviews',
            title: 'Reseñas',
            moduleKey: 'reviews',
            defaultOpen: true,
            searchText: 'resenas pendientes aprobadas rechazadas',
            body: (
              <p>
                Tres pestañas: <strong className="text-stone-200">Pendientes</strong>,{' '}
                <strong className="text-stone-200">Aprobadas</strong>,{' '}
                <strong className="text-stone-200">Rechazadas</strong>. Un botón de Aprobar o Rechazar por reseña — las
                aprobadas son las que se ven públicamente.
              </p>
            ),
          },
          {
            id: 'm-campanas',
            title: 'Campañas',
            moduleKey: 'campanas',
            defaultOpen: true,
            searchText: 'campanas flash segmento rappipromo descuento presupuesto programada activa',
            body: (
              <>
                <p>
                  Creá una campaña con nombre, tipo (flash / por segmento / Rappipromo), % de descuento, presupuesto y
                  estado. Si le pones una fecha de activación, el sistema la pasa de &ldquo;programada&rdquo; a
                  &ldquo;activa&rdquo; solo, sin que tengas que volver a entrar ese día.
                </p>
                <p>Un gráfico de barras te muestra las conversiones por campaña.</p>
              </>
            ),
          },
          {
            id: 'm-derechos',
            title: 'Derechos ARCO',
            moduleKey: 'derechos',
            defaultOpen: true,
            searchText: 'derechos arco ley 1581 pendiente en proceso respondida rechazada 10 dias',
            body: (
              <>
                <p>
                  Solicitudes de un cliente para consultar, corregir, borrar o reclamar sobre sus datos personales (Ley
                  1581 de Colombia). Tenés <strong className="text-stone-200">10 días hábiles</strong> desde que entra
                  la solicitud para responder.
                </p>
                <p>
                  El flujo: pendiente → en proceso → respondida o rechazada. Una vez respondida o rechazada, queda
                  cerrada — no se puede reabrir desde acá, y queda registrado quién respondió y cuándo.
                </p>
              </>
            ),
          },
        ],
      },
    ],
  },
];

const TAB_LABELS: Record<RoleTab, string> = {
  admin: 'Admin / Super Admin',
  operator: 'Cocina / Cajero',
  repartidor: 'Repartidor',
  marketing: 'Marketing',
};

const GuiaView: React.FC<{ role: UserRole }> = ({ role }) => {
  const [activeTab, setActiveTab] = useState<RoleTab>(() => roleTabFromUserRole(role));
  const [query, setQuery] = useState('');

  const activeRole = useMemo(() => ROLES.find((r) => r.tab === activeTab) ?? ROLES[0], [activeTab]);

  const q = query.trim().toLowerCase();
  const matches = (m: GuiaModule) => !q || `${m.title} ${m.searchText}`.toLowerCase().includes(q);

  return (
    <div className="p-8 md:p-12 space-y-8 pb-40 animate-fade-in">
      <div>
        <h1 className="text-5xl font-brand">Guía del sistema</h1>
        <p className="text-stone-500 mt-4 max-w-xl">
          Qué puede hacer cada rol, cómo entrar, y cómo se conecta todo con el agente de WhatsApp.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-stone-900 rounded-2xl border border-stone-800 w-fit">
        {ROLES.map((r) => (
          <button
            key={r.tab}
            onClick={() => setActiveTab(r.tab)}
            className={`px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === r.tab ? 'bg-orange-600 text-white' : 'text-stone-500'
            }`}
          >
            {TAB_LABELS[r.tab]}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <i className="fas fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 text-sm"></i>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar un módulo o palabra clave…"
          className="w-full bg-stone-900 border border-stone-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-stone-600 outline-none focus:border-orange-600/50"
        />
      </div>

      <div className="bg-stone-900/40 border border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-3 text-stone-300 text-sm">
        <h2 className="text-xl font-brand text-white">{activeRole.title}</h2>
        {activeRole.intro}
        <div className="flex flex-wrap gap-2 pt-1">
          {activeRole.chips.map((c) => (
            <Chip key={c.text} tone={c.tone}>
              {c.text}
            </Chip>
          ))}
        </div>
      </div>

      {activeRole.sections.map((section) => {
        const visibleModules = section.modules.filter(matches);
        if (visibleModules.length === 0) return null;
        return (
          <div key={section.label} className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-stone-600">{section.label}</p>
            <div className="space-y-2">
              {visibleModules.map((m) => (
                <details
                  key={m.id}
                  open={m.defaultOpen || !!q}
                  className="bg-stone-900/40 border border-white/5 rounded-2xl overflow-hidden"
                >
                  <summary className="flex items-baseline gap-2 px-5 py-4 cursor-pointer font-bold text-sm text-white list-none [&::-webkit-details-marker]:hidden">
                    <span>{m.title}</span>
                    {m.moduleKey && <Key>{m.moduleKey}</Key>}
                    <i className="fas fa-chevron-right ml-auto text-stone-600 text-xs transition-transform [details[open]_&]:rotate-90"></i>
                  </summary>
                  <div className="px-5 pb-5 space-y-2 text-sm text-stone-400">{m.body}</div>
                </details>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GuiaView;
