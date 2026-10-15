// registro-local.js
// Aquí vive toda la información de la app dentro del teléfono (localStorage).
// Como todo se guarda en el teléfono, la app funciona igual sin internet.
// Como solo hay un teléfono, incluye respaldo en archivo para que el registro no se pierda.

// Nombres con los que se guardan las listas en el teléfono
const LLAVE_DE_MIEMBROS = 'registro_compartido_miembros';
const LLAVE_DE_REGISTROS = 'registro_compartido_registros';

// Cuánto vale el dólar que se pone cuando alguien no viene (se cambia solo aquí)
export const MONTO_DEL_DOLAR_POR_AUSENCIA = 1;

// ---------- Lectura y escritura básica ----------

// Lee algo guardado; si no existe o está dañado, devuelve el valor por defecto
function leerDelAlmacenamiento(llave, valorPorDefecto) {
  const textoGuardado = localStorage.getItem(llave);
  if (textoGuardado === null) return valorPorDefecto;
  try {
    return JSON.parse(textoGuardado);
  } catch {
    return valorPorDefecto;
  }
}

// Guarda cualquier lista u objeto convirtiéndolo a texto
function escribirEnElAlmacenamiento(llave, valorParaGuardar) {
  localStorage.setItem(llave, JSON.stringify(valorParaGuardar));
}

// Cada registro se identifica por miembro + fecha, así no se repite el mismo día
function crearLlaveDelRegistro(identificadorDelMiembro, fechaDelRegistro) {
  return `${identificadorDelMiembro}_${fechaDelRegistro}`;
}

// Devuelve la fecha de hoy como AAAA-MM-DD usando la hora del teléfono
// (no uso toISOString porque cambia a hora UTC y puede dar el día equivocado)
export function obtenerFechaDeHoy() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// ---------- Miembros del grupo ----------

export function obtenerMiembros() {
  return leerDelAlmacenamiento(LLAVE_DE_MIEMBROS, []);
}

export function agregarMiembro(nombreCompleto) {
  if (!nombreCompleto || !nombreCompleto.trim()) {
    throw new Error('El nombre no puede estar vacío');
  }

  const listaDeMiembros = obtenerMiembros();
  const miembroNuevo = {
    identificador: crypto.randomUUID(),
    nombre_completo: nombreCompleto.trim(),
  };

  listaDeMiembros.push(miembroNuevo);
  escribirEnElAlmacenamiento(LLAVE_DE_MIEMBROS, listaDeMiembros);
  return miembroNuevo;
}

// ---------- Registros diarios ----------

// Guarda (o reemplaza) el registro de un miembro en una fecha
function guardarRegistro(datosDelRegistro) {
  const todosLosRegistros = leerDelAlmacenamiento(LLAVE_DE_REGISTROS, {});
  const llaveDelRegistro = crearLlaveDelRegistro(
    datosDelRegistro.identificador_del_miembro,
    datosDelRegistro.fecha_del_registro
  );

  todosLosRegistros[llaveDelRegistro] = datosDelRegistro;
  escribirEnElAlmacenamiento(LLAVE_DE_REGISTROS, todosLosRegistros);
}

// Botón de "sí vino": guarda su registro de ese día
export function guardarRegistroDelDia(identificadorDelMiembro, fechaDelRegistro, notaDelRegistro = '') {
  guardarRegistro({
    identificador_del_miembro: identificadorDelMiembro,
    fecha_del_registro: fechaDelRegistro,
    asistio: true,
    monto_en_dolares: 0,
    fue_agregado_manualmente: false,
    nota_del_registro: notaDelRegistro,
  });
}

// Botón de "no vino": pone el dólar de ese día a mano
export function registrarDolarPorAusencia(identificadorDelMiembro, fechaDelRegistro) {
  guardarRegistro({
    identificador_del_miembro: identificadorDelMiembro,
    fecha_del_registro: fechaDelRegistro,
    asistio: false,
    monto_en_dolares: MONTO_DEL_DOLAR_POR_AUSENCIA,
    fue_agregado_manualmente: true,
    nota_del_registro: '',
  });
}

// Por si se toca un botón por error: borra el registro de ese miembro en esa fecha
export function borrarRegistroDelDia(identificadorDelMiembro, fechaDelRegistro) {
  const todosLosRegistros = leerDelAlmacenamiento(LLAVE_DE_REGISTROS, {});
  delete todosLosRegistros[crearLlaveDelRegistro(identificadorDelMiembro, fechaDelRegistro)];
  escribirEnElAlmacenamiento(LLAVE_DE_REGISTROS, todosLosRegistros);
}

// Devuelve los registros de un mes (mes del 1 al 12), ordenados por fecha
export function obtenerRegistrosDelMes(anio, mes) {
  const todosLosRegistros = leerDelAlmacenamiento(LLAVE_DE_REGISTROS, {});
  const prefijoDeFecha = `${anio}-${String(mes).padStart(2, '0')}-`;

  return Object.values(todosLosRegistros)
    .filter((registro) => registro.fecha_del_registro.startsWith(prefijoDeFecha))
    .sort((registroA, registroB) => registroA.fecha_del_registro.localeCompare(registroB.fecha_del_registro));
}

// ---------- Respaldo (para que el registro no se pierda) ----------

// Descarga un archivo con todo el registro; funciona sin internet
export function descargarRespaldo() {
  const contenidoDelRespaldo = JSON.stringify(
    {
      miembros: obtenerMiembros(),
      registros: leerDelAlmacenamiento(LLAVE_DE_REGISTROS, {}),
    },
    null,
    2
  );

  const archivoDelRespaldo = new Blob([contenidoDelRespaldo], { type: 'application/json' });
  const direccionTemporal = URL.createObjectURL(archivoDelRespaldo);

  // Se crea un enlace invisible, se "toca" solo y se descarga el archivo
  const enlaceDeDescarga = document.createElement('a');
  enlaceDeDescarga.href = direccionTemporal;
  enlaceDeDescarga.download = `respaldo-registro-${obtenerFechaDeHoy()}.json`;
  enlaceDeDescarga.click();
  URL.revokeObjectURL(direccionTemporal);
}

// Restaura el registro desde el texto de un archivo de respaldo (reemplaza lo que hay)
export function restaurarRespaldo(textoDelRespaldo) {
  let datosDelRespaldo;
  try {
    datosDelRespaldo = JSON.parse(textoDelRespaldo);
  } catch {
    throw new Error('El archivo no es un respaldo válido');
  }

  const tieneMiembros = Array.isArray(datosDelRespaldo.miembros);
  const tieneRegistros = datosDelRespaldo.registros && typeof datosDelRespaldo.registros === 'object';
  if (!tieneMiembros || !tieneRegistros) {
    throw new Error('El archivo no es un respaldo válido');
  }

  escribirEnElAlmacenamiento(LLAVE_DE_MIEMBROS, datosDelRespaldo.miembros);
  escribirEnElAlmacenamiento(LLAVE_DE_REGISTROS, datosDelRespaldo.registros);
}
