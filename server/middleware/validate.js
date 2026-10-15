// Valida (y coacciona/transforma) req.body contra un schema Zod. En éxito,
// reemplaza req.body por los datos ya parseados -- el handler de la ruta
// puede confiar en que todo lo que lee de ahí ya está en el shape/rango
// correcto, sin repetir sanitización manual. En error, responde 400 con el
// mismo formato { error: string } que ya usa el resto de la API.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Faltan datos requeridos';
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}
