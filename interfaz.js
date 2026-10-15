// La interfaz importa únicamente funciones locales para leer y cambiar el registro.
import {
  obtenerFechaDeHoy,
  obtenerMiembros,
  agregarMiembro,
  guardarRegistroDelDia,
  registrarDolarPorAusencia,
  borrarRegistroDelDia,
  obtenerRegistrosDelMes,
  descargarRespaldo,
  restaurarRespaldo,
  MONTO_DEL_DOLAR_POR_AUSENCIA,
} from './registro-local.js';

// Se guardan aquí las referencias y selecciones temporales de esta pantalla.
const contenidoPrincipal = document.querySelector('#contenido-principal');
const enlacesDeNavegacion = [...document.querySelectorAll('[data-pantalla]')];
const nombresDeMeses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
let fechaSeleccionada = obtenerFechaDeHoy();
let mesMostrado = new Date(`${fechaSeleccionada}T12:00:00`);
let diaSeleccionadoDelMes = fechaSeleccionada;

// Convierte una fecha guardada en un texto legible sin depender de UTC.
function formatearFecha(fechaEnFormatoISO) {
  const [anio, mes, dia] = fechaEnFormatoISO.split('-');
  return `${dia}/${mes}`;
}

// Devuelve un registro concreto de la fecha seleccionada, si existe.
function buscarRegistroDelMiembro(identificadorDelMiembro, fechaDelRegistro) {
  const [anio, mes] = fechaDelRegistro.split('-').map(Number);
  return obtenerRegistrosDelMes(anio, mes).find((registro) =>
    registro.identificador_del_miembro === identificadorDelMiembro && registro.fecha_del_registro === fechaDelRegistro
  );
}

// Muestra la pestaña Hoy, con selección de fecha y acciones para cada miembro.
function mostrarPantallaDeHoy() {
  const miembrosDelGrupo = obtenerMiembros();
  contenidoPrincipal.innerHTML = `
    <section class="vista" aria-labelledby="titulo-vista">
      <div class="saludo"><p class="sobretitulo">REGISTRO DIARIO</p><h1 id="titulo-vista">Hoy</h1><p>Marca la asistencia del grupo.</p></div>
      <label class="campo-fecha">Fecha del registro<input id="selector-fecha" type="date" value="${fechaSeleccionada}" aria-label="Fecha del registro"></label>
      <div class="resumen-linea"><h2>Miembros</h2><span>${miembrosDelGrupo.length} ${miembrosDelGrupo.length === 1 ? 'persona' : 'personas'}</span></div>
      <div class="lista-tarjetas">${miembrosDelGrupo.length ? miembrosDelGrupo.map(crearTarjetaDelMiembro).join('') : crearEstadoVacio('Aún no hay miembros', 'Agrega a las personas del grupo desde la pestaña Miembros.')}</div>
      <button class="enlace-respaldo" data-accion="respaldo">Guardar o restaurar un respaldo <span aria-hidden="true">→</span></button>
    </section>`;
  contenidoPrincipal.querySelector('#selector-fecha').addEventListener('change', (evento) => {
    fechaSeleccionada = evento.target.value || obtenerFechaDeHoy();
    mostrarPantallaDeHoy();
  });
  contenidoPrincipal.querySelectorAll('[data-accion="asistencia"]').forEach((boton) => boton.addEventListener('click', guardarAsistencia));
  contenidoPrincipal.querySelectorAll('[data-accion="ausencia"]').forEach((boton) => boton.addEventListener('click', guardarAusencia));
  contenidoPrincipal.querySelectorAll('[data-accion="borrar"]').forEach((boton) => boton.addEventListener('click', deshacerRegistro));
  contenidoPrincipal.querySelector('[data-accion="respaldo"]')?.addEventListener('click', () => navegarA('respaldo'));
}

// Construye una tarjeta con estado y botones grandes, o la acción para deshacer.
function crearTarjetaDelMiembro(miembroDelGrupo) {
  const registroDelDia = buscarRegistroDelMiembro(miembroDelGrupo.identificador, fechaSeleccionada);
  const claseDeEstado = registroDelDia ? (registroDelDia.asistio ? 'estado-vino' : 'estado-ausente') : '';
  const estadoVisible = registroDelDia ? `<div class="estado ${claseDeEstado}"><span class="punto-estado"></span>${registroDelDia.asistio ? 'Sí vino a ensayo' : 'No vino'}</div>` : '';
  const acciones = registroDelDia
    ? `<button class="boton-deshacer" data-accion="borrar" data-miembro="${miembroDelGrupo.identificador}">Deshacer registro</button>`
    : `<div class="acciones-asistencia"><button class="boton-asistencia boton-vino" data-accion="asistencia" data-miembro="${miembroDelGrupo.identificador}"><span class="simbolo">✓</span><span>Sí vino a ensayo</span></button><button class="boton-asistencia boton-ausente" data-accion="ausencia" data-miembro="${miembroDelGrupo.identificador}"><span class="simbolo">+$</span><span>No vino <small>(+$${MONTO_DEL_DOLAR_POR_AUSENCIA})</small></span></button></div>`;
  return `<article class="tarjeta-miembro ${claseDeEstado}"><div class="nombre-miembro">${escaparTexto(miembroDelGrupo.nombre_completo)}</div>${estadoVisible}${acciones}</article>`;
}

// Registra directamente la asistencia, sin solicitar notas.
function guardarAsistencia(eventoDelBoton) {
  guardarRegistroDelDia(eventoDelBoton.currentTarget.dataset.miembro, fechaSeleccionada);
  mostrarPantallaDeHoy();
}

// Registra el dólar manual correspondiente a una ausencia.
function guardarAusencia(eventoDelBoton) {
  registrarDolarPorAusencia(eventoDelBoton.currentTarget.dataset.miembro, fechaSeleccionada);
  mostrarPantallaDeHoy();
}

// Confirma antes de quitar el registro guardado para ese día.
function deshacerRegistro(eventoDelBoton) {
  const miembroDelGrupo = obtenerMiembros().find((miembro) => miembro.identificador === eventoDelBoton.currentTarget.dataset.miembro);
  if (!window.confirm(`¿Deshacer el registro de ${miembroDelGrupo?.nombre_completo ?? 'esta persona'} para el ${formatearFecha(fechaSeleccionada)}?`)) return;
  borrarRegistroDelDia(eventoDelBoton.currentTarget.dataset.miembro, fechaSeleccionada);
  mostrarPantallaDeHoy();
}

// Presenta la tabla mensual y los totales por miembro.
function mostrarTablaDelMes() {
  const anioMostrado = mesMostrado.getFullYear();
  const numeroDeMes = mesMostrado.getMonth() + 1;
  const registrosDelMes = obtenerRegistrosDelMes(anioMostrado, numeroDeMes);
  const miembrosDelGrupo = obtenerMiembros();
  const mesEnFormatoISO = `${anioMostrado}-${String(numeroDeMes).padStart(2, '0')}`;
  if (!diaSeleccionadoDelMes.startsWith(`${mesEnFormatoISO}-`)) diaSeleccionadoDelMes = `${mesEnFormatoISO}-01`;
  const ultimoDiaDelMes = String(new Date(anioMostrado, numeroDeMes, 0).getDate()).padStart(2, '0');
  const registrosDelDiaSeleccionado = registrosDelMes.filter((registro) => registro.fecha_del_registro === diaSeleccionadoDelMes);
  const totalesDelMes = miembrosDelGrupo.map((miembro) => ({
    nombre: miembro.nombre_completo,
    total: registrosDelMes.filter((registro) => registro.identificador_del_miembro === miembro.identificador)
      .reduce((suma, registro) => suma + Number(registro.monto_en_dolares || 0), 0),
  }));
  contenidoPrincipal.innerHTML = `
    <section class="vista" aria-labelledby="titulo-vista">
      <div class="saludo"><p class="sobretitulo">RESUMEN DEL GRUPO</p><h1 id="titulo-vista">Tabla del mes</h1><p>Consulta asistencias y aportes registrados.</p></div>
      <div class="selector-mes"><button class="boton-icono boton-mes" data-mover-mes="-1" aria-label="Mes anterior"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button><h2>${nombresDeMeses[mesMostrado.getMonth()]} <span>${anioMostrado}</span></h2><button class="boton-icono boton-mes" data-mover-mes="1" aria-label="Mes siguiente"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button></div>
      <div class="tarjeta-totales"><div class="resumen-linea"><div><p class="sobretitulo">DÓLARES DEL MES</p><h2>Por miembro</h2></div><span class="insignia-dolar">$</span></div>
      ${totalesDelMes.length ? `<ul class="lista-totales">${totalesDelMes.map((totalDelMiembro) => `<li><span>${escaparTexto(totalDelMiembro.nombre)}</span><strong>$${totalDelMiembro.total.toFixed(2)}</strong></li>`).join('')}</ul>` : '<p class="texto-suave">Agrega miembros para ver sus totales.</p>'}</div>
      <div class="tarjeta-dia"><div class="selector-dia"><div><p class="sobretitulo">VER ASISTENCIA</p><h2>Elige un día</h2></div><input id="selector-dia-mes" type="date" value="${diaSeleccionadoDelMes}" min="${mesEnFormatoISO}-01" max="${mesEnFormatoISO}-${ultimoDiaDelMes}" aria-label="Elige un día del mes"></div><h3 class="titulo-detalle-dia">Asistencia del ${formatearFecha(diaSeleccionadoDelMes)}</h3>${crearListaDeAsistenciaDelDia(miembrosDelGrupo, registrosDelDiaSeleccionado)}</div>
      <button class="enlace-respaldo" data-accion="respaldo">Guardar o restaurar un respaldo <span aria-hidden="true">→</span></button>
    </section>`;
  contenidoPrincipal.querySelectorAll('[data-mover-mes]').forEach((boton) => boton.addEventListener('click', () => {
    mesMostrado.setMonth(mesMostrado.getMonth() + Number(boton.dataset.moverMes));
    diaSeleccionadoDelMes = `${mesMostrado.getFullYear()}-${String(mesMostrado.getMonth() + 1).padStart(2, '0')}-01`;
    mostrarTablaDelMes();
  }));
  contenidoPrincipal.querySelector('#selector-dia-mes').addEventListener('change', (eventoDelSelector) => {
    diaSeleccionadoDelMes = eventoDelSelector.currentTarget.value || `${mesEnFormatoISO}-01`;
    mostrarTablaDelMes();
  });
  contenidoPrincipal.querySelector('[data-accion="respaldo"]')?.addEventListener('click', () => navegarA('respaldo'));
}

// Lista a todas las personas para el día elegido y señala su estado de asistencia.
function crearListaDeAsistenciaDelDia(miembrosDelGrupo, registrosDelDia) {
  if (!miembrosDelGrupo.length) return crearEstadoVacio('No hay miembros todavía', 'Agrega miembros para consultar la asistencia del día.');
  if (!registrosDelDia.length) return crearEstadoVacio('Sin registros para este día', 'Todavía no se ha marcado la asistencia de esta fecha.');
  return `<ul class="lista-asistencia-dia">${miembrosDelGrupo.map((miembroDelGrupo) => {
    const registroDelMiembro = registrosDelDia.find((registro) => registro.identificador_del_miembro === miembroDelGrupo.identificador);
    const estadoDelMiembro = registroDelMiembro ? (registroDelMiembro.asistio ? 'Sí vino a ensayo' : 'No vino') : 'Sin marcar';
    const claseDelMiembro = registroDelMiembro ? (registroDelMiembro.asistio ? 'dia-vino' : 'dia-ausente') : 'dia-pendiente';
    return `<li><span>${escaparTexto(miembroDelGrupo.nombre_completo)}</span><strong class="${claseDelMiembro}">${estadoDelMiembro}</strong></li>`;
  }).join('')}</ul>`;
}

// Permite agregar personas nuevas y muestra la lista actual del grupo.
function mostrarMiembros() {
  const miembrosDelGrupo = obtenerMiembros();
  contenidoPrincipal.innerHTML = `
    <section class="vista" aria-labelledby="titulo-vista">
      <div class="saludo"><p class="sobretitulo">TU GRUPO</p><h1 id="titulo-vista">Miembros</h1><p>Administra las personas de tu registro.</p></div>
      <form id="formulario-miembro" class="formulario-miembro"><label for="nombre-miembro">Nombre de la persona</label><div class="campo-agregar"><input id="nombre-miembro" name="nombre" type="text" maxlength="90" placeholder="Por ejemplo, Ana López" autocomplete="name" required><button class="boton-principal" type="submit"><span aria-hidden="true">+</span> Agregar</button></div></form>
      <div class="resumen-linea"><h2>Lista de miembros</h2><span>${miembrosDelGrupo.length}</span></div>
      <ul class="lista-miembros">${miembrosDelGrupo.length ? miembrosDelGrupo.map((miembroDelGrupo) => `<li><span class="avatar-inicial">${escaparTexto(miembroDelGrupo.nombre_completo.trim().charAt(0).toLocaleUpperCase('es'))}</span><span>${escaparTexto(miembroDelGrupo.nombre_completo)}</span></li>`).join('') : `<li class="mensaje-lista">Todavía no has agregado a nadie.</li>`}</ul>
      <button class="enlace-respaldo" data-accion="respaldo">Guardar o restaurar un respaldo <span aria-hidden="true">→</span></button>
    </section>`;
  contenidoPrincipal.querySelector('#formulario-miembro').addEventListener('submit', (eventoDelFormulario) => {
    eventoDelFormulario.preventDefault();
    const campoDeNombre = eventoDelFormulario.currentTarget.elements.nombre;
    try {
      agregarMiembro(campoDeNombre.value);
      mostrarMiembros();
      contenidoPrincipal.querySelector('#nombre-miembro').focus();
    } catch (error) {
      window.alert(error.message || 'No se pudo agregar el miembro.');
    }
  });
  contenidoPrincipal.querySelector('[data-accion="respaldo"]')?.addEventListener('click', () => navegarA('respaldo'));
}

// Muestra las acciones para descargar y restaurar una copia de los datos.
function mostrarRespaldo() {
  contenidoPrincipal.innerHTML = `
    <section class="vista" aria-labelledby="titulo-vista">
      <div class="saludo"><p class="sobretitulo">TUS DATOS</p><h1 id="titulo-vista">Respaldo</h1><p>Guarda una copia de tu registro o recupérala desde un archivo.</p></div>
      <article class="tarjeta-respaldo"><span class="icono-respaldo"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3"/></svg></span><div><h2>Descargar una copia</h2><p>Guarda todos tus miembros y registros en un archivo .json.</p></div><button id="descargar-respaldo" class="boton-principal ancho-completo">Descargar respaldo</button></article>
      <article class="tarjeta-respaldo"><span class="icono-respaldo icono-restaurar"><svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 17v3h14v-3"/></svg></span><div><h2>Restaurar un respaldo</h2><p>Elige un archivo .json guardado anteriormente.</p></div><div class="aviso-reemplazo"><strong>Ten en cuenta</strong><span>La restauración reemplaza los miembros y registros que tienes ahora.</span></div><label class="boton-secundario ancho-completo selector-archivo" for="archivo-respaldo">Elegir archivo .json</label><input class="solo-lector" id="archivo-respaldo" type="file" accept="application/json,.json"></article>
      <article class="tarjeta-respaldo tarjeta-actualizacion"><span class="icono-respaldo"><svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.7 9A7 7 0 0 1 18 6.5L20 12M4 12l2 5.5A7 7 0 0 0 18.3 15"/></svg></span><div><h2>Actualizar aplicación</h2><p>Busca cambios nuevos publicados y recarga la app si hay una versión reciente.</p></div><button id="boton-actualizar-app" class="boton-secundario ancho-completo">Buscar actualizaciones</button><p id="estado-actualizacion" class="estado-actualizacion" aria-live="polite"></p></article>
      <button class="enlace-respaldo" data-accion="volver">← Volver a Hoy</button>
    </section>`;
  contenidoPrincipal.querySelector('#descargar-respaldo').addEventListener('click', descargarRespaldo);
  contenidoPrincipal.querySelector('#archivo-respaldo').addEventListener('change', restaurarArchivoDeRespaldo);
  contenidoPrincipal.querySelector('#boton-actualizar-app').addEventListener('click', actualizarAplicacion);
  contenidoPrincipal.querySelector('[data-accion="volver"]').addEventListener('click', () => navegarA('hoy'));
}

// Consulta el servidor y recarga la app solo si encuentra una versión nueva.
async function actualizarAplicacion(eventoDelBoton) {
  const botonDeActualizacion = eventoDelBoton.currentTarget;
  const mensajeDeActualizacion = contenidoPrincipal.querySelector('#estado-actualizacion');
  botonDeActualizacion.disabled = true;
  mensajeDeActualizacion.textContent = 'Buscando actualizaciones…';
  try {
    if (!('serviceWorker' in navigator)) throw new Error('Este navegador no admite actualizaciones de la aplicación.');
    let registroDelServiceWorker = await navigator.serviceWorker.getRegistration();
    if (!registroDelServiceWorker) registroDelServiceWorker = await navigator.serviceWorker.register('./service-worker.js');

    let seEncontroUnaVersionNueva = false;
    let seActivoUnaVersionNueva = false;
    let escucharCambioDeControlador;
    let escucharNuevaInstalacion;
    const cambioDeControlador = new Promise((resolverCambio) => {
      escucharCambioDeControlador = () => {
        seActivoUnaVersionNueva = true;
        resolverCambio();
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', escucharCambioDeControlador, { once: true });
    });
    const instalacionDetectada = new Promise((resolverInstalacion) => {
      escucharNuevaInstalacion = () => {
        seEncontroUnaVersionNueva = true;
        const workerEnInstalacion = registroDelServiceWorker.installing;
        if (!workerEnInstalacion) return resolverInstalacion();
        workerEnInstalacion.addEventListener('statechange', () => {
          if (workerEnInstalacion.state === 'activated' || workerEnInstalacion.state === 'redundant') resolverInstalacion();
        });
      };
      registroDelServiceWorker.addEventListener('updatefound', escucharNuevaInstalacion, { once: true });
    });

    await registroDelServiceWorker.update();
    if (registroDelServiceWorker.waiting) registroDelServiceWorker.waiting.postMessage({ tipo: 'ACTIVAR_ACTUALIZACION' });
    if (seEncontroUnaVersionNueva) await Promise.race([instalacionDetectada, cambioDeControlador]);
    if (seActivoUnaVersionNueva) return;
    if (seEncontroUnaVersionNueva) {
      mensajeDeActualizacion.textContent = 'Actualización instalada. Recargando…';
      window.location.reload();
      return;
    }
    navigator.serviceWorker.removeEventListener('controllerchange', escucharCambioDeControlador);
    registroDelServiceWorker.removeEventListener('updatefound', escucharNuevaInstalacion);
    mensajeDeActualizacion.textContent = 'Ya tienes la versión más reciente.';
  } catch (error) {
    mensajeDeActualizacion.textContent = error.message || 'No se pudo buscar una actualización. Revisa tu conexión e inténtalo de nuevo.';
  } finally {
    botonDeActualizacion.disabled = false;
  }
}

// Lee el archivo elegido y confirma que se puede reemplazar la información actual.
async function restaurarArchivoDeRespaldo(eventoDelCampo) {
  const archivoElegido = eventoDelCampo.currentTarget.files?.[0];
  if (!archivoElegido) return;
  if (!window.confirm('Restaurar este respaldo reemplazará todos los miembros y registros actuales. ¿Quieres continuar?')) {
    eventoDelCampo.currentTarget.value = '';
    return;
  }
  try {
    restaurarRespaldo(await archivoElegido.text());
    fechaSeleccionada = obtenerFechaDeHoy();
    window.alert('Respaldo restaurado correctamente.');
    navegarA('hoy');
  } catch (error) {
    window.alert(error.message || 'No se pudo restaurar el respaldo.');
    eventoDelCampo.currentTarget.value = '';
  }
}

// Devuelve una presentación común cuando todavía no hay información que mostrar.
function crearEstadoVacio(tituloDelMensaje, explicacionDelMensaje) {
  return `<div class="estado-vacio"><span class="icono-vacio" aria-hidden="true">✳</span><h3>${tituloDelMensaje}</h3><p>${explicacionDelMensaje}</p></div>`;
}

// Escapa texto aportado por la persona antes de presentarlo como HTML.
function escaparTexto(textoSinEscapar) {
  return String(textoSinEscapar).replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);
}

// Cambia el contenido visible y mantiene sincronizado el estado de la navegación.
function navegarA(nombreDePantalla) {
  history.replaceState(null, '', nombreDePantalla === 'respaldo' ? '#respaldo' : `#${nombreDePantalla}`);
  enlacesDeNavegacion.forEach((enlaceDeNavegacion) => {
    if (enlaceDeNavegacion.dataset.pantalla === nombreDePantalla) enlaceDeNavegacion.setAttribute('aria-current', 'page');
    else enlaceDeNavegacion.removeAttribute('aria-current');
  });
  const pantallas = { hoy: mostrarPantallaDeHoy, tabla: mostrarTablaDelMes, miembros: mostrarMiembros, respaldo: mostrarRespaldo };
  (pantallas[nombreDePantalla] || mostrarPantallaDeHoy)();
  contenidoPrincipal.scrollTop = 0;
}

// Conecta la navegación y abre la pestaña indicada en el enlace inicial.
enlacesDeNavegacion.forEach((enlaceDeNavegacion) => enlaceDeNavegacion.addEventListener('click', (eventoDeNavegacion) => {
  eventoDeNavegacion.preventDefault();
  navegarA(enlaceDeNavegacion.dataset.pantalla);
}));
document.querySelector('#abrir-respaldo').addEventListener('click', () => navegarA('respaldo'));
navegarA(location.hash.slice(1) || 'hoy');
