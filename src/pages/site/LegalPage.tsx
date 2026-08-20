import { useParams, Link } from 'react-router-dom';

const LEGAL_PAGES: Record<string, { title: string; kicker: string; icon: string; content: React.ReactNode }> = {
  'politica-de-privacidad': {
    title: 'Política de Privacidad',
    kicker: 'Política de Tratamiento de Datos Personales — Ley 1581 de 2012',
    icon: 'fa-solid fa-shield-halved',
    content: (
      <>
        <p className="text-sm text-carbon/50 mb-6">Última actualización: 11 de agosto de 2026.</p>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">1. ¿Quiénes somos?</h2>
          <p className="text-carbon/70 leading-relaxed mb-3">
            <strong>Juancho&apos;s Pizza y Comidas Rápidas</strong> es el responsable del tratamiento de los datos
            personales recopilados a través de nuestro sitio web, pedidos por WhatsApp y canales de venta.
          </p>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>
              <strong>Sede Nemocón:</strong> Cra 6 No. 5-40, Vía Principal, Nemocón, Cundinamarca.
            </li>
            <li>
              <strong>Sede Zipaquirá:</strong> Diagonal 4 #29-10, Barrio Las Villas, Zipaquirá, Cundinamarca.
            </li>
            <li>
              <strong>Teléfonos:</strong>{' '}
              <a href="tel:+573108613690" className="text-tomato hover:underline">
                310 861 3690
              </a>{' '}
              ·{' '}
              <a href="tel:+573227699056" className="text-tomato hover:underline">
                322 769 9056
              </a>
            </li>
            <li>
              <strong>Correo:</strong>{' '}
              <a href="mailto:contacto@juanchospizza.com" className="text-tomato hover:underline">
                contacto@juanchospizza.com
              </a>
            </li>
          </ul>
          <p className="text-carbon/70 leading-relaxed mt-3">
            Actuamos conforme a la <strong>Ley 1581 de 2012</strong>, el <strong>Decreto 1377 de 2013</strong> y las
            demás normas que los modifiquen, bajo la vigilancia de la{' '}
            <strong>Superintendencia de Industria y Comercio (SIC)</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">2. Datos que recopilamos</h2>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>
              <strong>De identificación y contacto:</strong> nombre, teléfono, dirección de entrega y correo
              electrónico.
            </li>
            <li>
              <strong>De pedidos:</strong> productos, tamaños, cantidades, precios, historial y preferencias.
            </li>
            <li>
              <strong>De pago:</strong> no almacenamos datos de tarjeta; son procesados por <strong>Bold</strong>.
            </li>
            <li>
              <strong>De navegación:</strong> dirección IP, tipo de dispositivo, navegador, páginas visitadas.
            </li>
            <li>
              <strong>De WhatsApp:</strong> los mensajes e información que compartes al hacer pedidos.
            </li>
            <li>
              <strong>De marketing:</strong> tu preferencia de recibir promociones.
            </li>
            <li>
              <strong>De consentimiento:</strong> fecha, hora, IP y navegador con los que autorizaste.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">3. Finalidades del tratamiento</h2>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>Gestionar, procesar y entregar tus pedidos, incluidos los domicilios.</li>
            <li>Emitir facturas y cumplir con la facturación electrónica ante la DIAN.</li>
            <li>Procesar pagos, reembolsos y reversiones.</li>
            <li>Atender consultas, reclamos y dar seguimiento a tus pedidos.</li>
            <li>Mejorar nuestro menú, servicio y experiencia de compra.</li>
            <li>
              Enviarte promociones y novedades, <strong>solo si nos diste tu consentimiento</strong>.
            </li>
            <li>Prevenir el fraude y proteger la seguridad de la información.</li>
            <li>Cumplir obligaciones legales, fiscales y contables.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">4. Autorización</h2>
          <p className="text-carbon/70 leading-relaxed">
            El tratamiento de tus datos se basa en tu <strong>autorización previa, expresa e informada</strong>, tal
            como lo exige el artículo 7 de la Ley 1581 de 2012. Al realizar un pedido o navegar por nuestro sitio,
            aceptas esta política. Puedes <strong>revocar tu autorización en cualquier momento</strong> por los canales
            de la sección 6.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">5. Tus derechos</h2>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>
              Conocer, <strong>actualizar y rectificar</strong> tus datos personales.
            </li>
            <li>
              Solicitar <strong>prueba de la autorización</strong> otorgada.
            </li>
            <li>
              Ser informado del <strong>uso que se ha dado</strong> a tus datos.
            </li>
            <li>
              Presentar <strong>quejas ante la SIC</strong> por infracciones a la ley.
            </li>
            <li>
              <strong>Revocar la autorización y/o solicitar la supresión</strong> de tus datos.
            </li>
            <li>
              Acceder de forma <strong>gratuita</strong> a tus datos personales.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">6. Canales para ejercer tus derechos</h2>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>
              <strong>Correo:</strong>{' '}
              <a
                href="mailto:contacto@juanchospizza.com?subject=Derechos%20de%20Datos%20Personales"
                className="text-tomato hover:underline"
              >
                contacto@juanchospizza.com
              </a>
            </li>
            <li>
              <strong>WhatsApp:</strong>{' '}
              <a
                href="https://wa.me/573108613690"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tomato hover:underline"
              >
                310 861 3690
              </a>
            </li>
            <li>
              <strong>En nuestras sedes:</strong> Nemocón y Zipaquirá.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">7. Seguridad y conservación</h2>
          <p className="text-carbon/70 leading-relaxed">
            Aplicamos medidas técnicas, administrativas y físicas razonables para proteger tus datos. Conservamos tus
            datos durante el tiempo necesario para cumplir las finalidades de esta política y los plazos legales
            aplicables.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">8. Contacto</h2>
          <div className="bg-crema rounded-xl p-6">
            <p className="text-carbon/70 mb-3">
              <strong>Juancho&apos;s Pizza y Comidas Rápidas</strong>
            </p>
            <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
              <li>
                <a href="mailto:contacto@juanchospizza.com" className="text-tomato hover:underline">
                  contacto@juanchospizza.com
                </a>
              </li>
              <li>
                <a href="tel:+573108613690" className="text-tomato hover:underline">
                  310 861 3690
                </a>{' '}
                ·{' '}
                <a href="tel:+573227699056" className="text-tomato hover:underline">
                  322 769 9056
                </a>
              </li>
              <li>Autoridad de control: Superintendencia de Industria y Comercio</li>
            </ul>
            <Link
              to="/eliminacion-de-datos"
              className="inline-block mt-4 bg-tomato text-white text-sm font-heading uppercase px-6 py-2 rounded-lg hover:bg-tomato-600 transition-colors"
            >
              Solicitar eliminación de mis datos
            </Link>
          </div>
        </section>
      </>
    ),
  },
  'terminos-y-condiciones': {
    title: 'Términos y Condiciones',
    kicker: "Los acuerdos que rigen tu experiencia con Juancho's Pizza",
    icon: 'fa-solid fa-file-contract',
    content: (
      <>
        <p className="text-sm text-carbon/50 mb-6">Última actualización: 11 de agosto de 2026.</p>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">1. Aceptación de los términos</h2>
          <p className="text-carbon/70 leading-relaxed">
            Al ingresar a nuestro sitio web, navegar por él o realizar un pedido, aceptas estos Términos y Condiciones y
            nuestra{' '}
            <Link to="/politica-de-privacidad" className="text-tomato hover:underline">
              Política de Privacidad
            </Link>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">2. Información general</h2>
          <p className="text-carbon/70 leading-relaxed mb-3">
            <strong>Juancho&apos;s Pizza y Comidas Rápidas</strong> opera dos sedes en Cundinamarca, Colombia:
          </p>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>
              <strong>Nemocón:</strong> Cra 6 No. 5-40, Vía Principal.
            </li>
            <li>
              <strong>Zipaquirá:</strong> Diagonal 4 #29-10, Barrio Las Villas.
            </li>
            <li>
              <strong>Contacto:</strong>{' '}
              <a href="tel:+573108613690" className="text-tomato hover:underline">
                310 861 3690
              </a>{' '}
              ·{' '}
              <a href="mailto:contacto@juanchospizza.com" className="text-tomato hover:underline">
                contacto@juanchospizza.com
              </a>
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">3. Pedidos y precios</h2>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>
              Los precios están en <strong>pesos colombianos (COP)</strong> e incluyen IVA.
            </li>
            <li>Los precios y el menú pueden cambiar sin previo aviso.</li>
            <li>Tu pedido se considera confirmado cuando lo aceptamos.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">4. Pagos</h2>
          <p className="text-carbon/70 leading-relaxed mb-3">Aceptamos:</p>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>
              <strong>Efectivo</strong> contra entrega.
            </li>
            <li>
              <strong>Nequi</strong> y <strong>Daviplata</strong>.
            </li>
            <li>
              <strong>Tarjeta</strong> débito y crédito, procesadas por <strong>Bold</strong>.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">5. Domicilios y entregas</h2>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>
              <strong>Horarios:</strong> lunes a domingo, de 4:00 p.m. a 10:00 p.m.
            </li>
            <li>
              <strong>Cobertura:</strong> Nemocón y sus veredas, y el área urbana de Zipaquirá.
            </li>
            <li>
              <strong>Envío:</strong> gratuito dentro de nuestras zonas de cobertura.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">6. Derecho de retracto</h2>
          <p className="text-carbon/70 leading-relaxed">
            El retracto no procede sobre alimentos preparados y perecederos conforme a las excepciones de la{' '}
            <strong>Ley 1480 de 2011</strong>. En su lugar, ofrecemos nuestra <strong>Garantía Juancho&apos;s</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">7. Garantías y calidad</h2>
          <p className="text-carbon/70 leading-relaxed">
            Si algo no está perfecto — producto incorrecto, incompleto o en mal estado — escríbenos por WhatsApp al{' '}
            <a
              href="https://wa.me/573108613690"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tomato hover:underline"
            >
              310 861 3690
            </a>{' '}
            y lo resolvemos.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">8. Ley aplicable</h2>
          <p className="text-carbon/70 leading-relaxed">
            Estos términos se rigen por las leyes de la <strong>República de Colombia</strong>. Las controversias podrán
            ser conocidas por la <strong>Superintendencia de Industria y Comercio</strong> o por la autoridad judicial
            competente de Cundinamarca.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">9. Contacto</h2>
          <div className="bg-crema rounded-xl p-6">
            <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
              <li>
                <a href="tel:+573108613690" className="text-tomato hover:underline">
                  310 861 3690
                </a>{' '}
                ·{' '}
                <a href="tel:+573227699056" className="text-tomato hover:underline">
                  322 769 9056
                </a>
              </li>
              <li>
                <a href="mailto:contacto@juanchospizza.com" className="text-tomato hover:underline">
                  contacto@juanchospizza.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/573108613690"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tomato hover:underline"
                >
                  Escríbenos por WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </section>
      </>
    ),
  },
  'eliminacion-de-datos': {
    title: 'Eliminación de Datos',
    kicker: 'Tu derecho a la supresión de tus datos personales',
    icon: 'fa-solid fa-user-slash',
    content: (
      <>
        <p className="text-sm text-carbon/50 mb-6">Última actualización: 11 de agosto de 2026.</p>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">1. Tu derecho a la supresión</h2>
          <p className="text-carbon/70 leading-relaxed mb-3">
            La <strong>Ley 1581 de 2012</strong> te garantiza el derecho a solicitar la{' '}
            <strong>supresión de tus datos personales</strong> cuando:
          </p>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>Los datos ya no son necesarios para la finalidad con la que fueron recopilados.</li>
            <li>Revocas tu autorización de tratamiento.</li>
            <li>Se incumplen los principios y garantías de la ley.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">2. Cómo solicitarlo</h2>
          <ol className="list-decimal list-inside text-carbon/70 space-y-2 ml-4">
            <li>
              <strong>Por correo:</strong> escribe a{' '}
              <a
                href="mailto:contacto@juanchospizza.com?subject=Eliminaci%C3%B3n%20de%20datos%20personales"
                className="text-tomato hover:underline"
              >
                contacto@juanchospizza.com
              </a>
            </li>
            <li>
              <strong>Por WhatsApp:</strong> envíanos un mensaje al{' '}
              <a
                href="https://wa.me/573108613690?text=Hola%2C%20quiero%20solicitar%20la%20eliminaci%C3%B3n%20de%20mis%20datos%20personales"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tomato hover:underline"
              >
                310 861 3690
              </a>
            </li>
            <li>
              <strong>En nuestras sedes:</strong> presenta tu solicitud directamente en Nemocón o Zipaquirá.
            </li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">3. Plazos de respuesta</h2>
          <ul className="list-disc list-inside text-carbon/70 space-y-1 ml-4">
            <li>
              <strong>Eliminación y revocación:</strong> hasta <strong>15 días hábiles</strong>.
            </li>
            <li>
              <strong>Baja de marketing:</strong> de forma <strong>inmediata</strong>.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-carbon mb-3">4. Contacto</h2>
          <div className="bg-crema rounded-xl p-6 flex flex-wrap gap-4">
            <a
              href="https://wa.me/573108613690?text=Hola%2C%20quiero%20solicitar%20la%20eliminaci%C3%B3n%20de%20mis%20datos%20personales"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white text-sm font-heading uppercase px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Solicitar por WhatsApp
            </a>
            <a
              href="mailto:contacto@juanchospizza.com?subject=Eliminaci%C3%B3n%20de%20datos%20personales"
              className="bg-tomato text-white text-sm font-heading uppercase px-6 py-2 rounded-lg hover:bg-tomato-600 transition-colors"
            >
              Solicitar por correo
            </a>
          </div>
        </section>
      </>
    ),
  },
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = LEGAL_PAGES[slug || ''];

  if (!page) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">📄</p>
          <h1 className="font-heading text-3xl text-carbon mb-4">Página no encontrada</h1>
          <Link to="/" className="text-tomato hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-crema min-h-screen">
      {/* Hero */}
      <div className="bg-carbon py-16 px-4 text-center">
        <span className="inline-block bg-crema/10 text-queso text-sm font-heading uppercase tracking-wider px-4 py-1 rounded-full mb-4">
          <i className={page.icon}></i> Documento legal
        </span>
        <h1 className="font-heading text-4xl md:text-5xl text-crema mb-3">{page.title}</h1>
        <p className="text-crema/60 text-lg">{page.kicker}</p>
        <div className="flex justify-center gap-3 mt-4">
          <span className="text-crema/40 text-sm">
            <i className="fa-solid fa-calendar-check"></i> Vigente desde: 11 de agosto de 2026
          </span>
          <span className="text-crema/40 text-sm">
            <i className="fa-solid fa-location-dot"></i> Colombia
          </span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <p className="text-carbon/50 text-sm mb-2">
          <Link to="/" className="hover:text-tomato transition-colors">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-tomato">{page.title}</span>
        </p>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 pb-16">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10">{page.content}</div>
      </div>
    </div>
  );
}
