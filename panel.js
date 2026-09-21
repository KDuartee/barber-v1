import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabasePublishableKey, supabaseUrl } from "./supabase-config.js";

const supabase = createClient(supabaseUrl, supabasePublishableKey);
const formulario = document.querySelector("#formulario-panel");
const clave = document.querySelector("#clave");
const estadoPanel = document.querySelector("#estado-panel");
const tablaCitas = document.querySelector("#tabla-citas");
const estadisticas = document.querySelector("#estadisticas");
const statIngresos = document.querySelector("#stat-ingresos");
const statCitas = document.querySelector("#stat-citas");
const statCliente = document.querySelector("#stat-cliente");
const statServicios = document.querySelector("#stat-servicios");
const cerrarSesion = document.querySelector("#cerrar-sesion");
const refrescar = document.querySelector("#refrescar");
const diasBloqueadosSection = document.querySelector("#dias-bloqueados");
const formularioBloqueo = document.querySelector("#formulario-bloqueo");
const fechaBloqueo = document.querySelector("#fecha-bloqueo");
const motivoBloqueo = document.querySelector("#motivo-bloqueo");
const listaBloqueados = document.querySelector("#lista-bloqueados");
const avisoNuevas = document.querySelector("#aviso-nuevas");
const claveVistas = "collins-citas-vistas-v1";

let contraseñaActual = "";
let cargaEnCurso = false;
let estadisticasEnCurso = false;
let bloqueosEnCurso = false;
let actualizacionAutomatica = null;

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[caracter]);
}

function obtenerCitasVistas(citas) {
  try {
    const guardadas = localStorage.getItem(claveVistas);
    if (guardadas) return new Set(JSON.parse(guardadas));
    const iniciales = citas.map((cita) => String(cita.id));
    localStorage.setItem(claveVistas, JSON.stringify(iniciales));
    return new Set(iniciales);
  } catch {
    return new Set(citas.map((cita) => String(cita.id)));
  }
}

function formatoMoneda(numero) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(numero);
}

function formatoHora12(horaTexto) {
  const [horas, minutos] = horaTexto.split(":").map(Number);
  const fecha = new Date();
  fecha.setHours(horas, minutos, 0, 0);
  return fecha.toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function mostrarEstadisticas(stats) {
  statIngresos.textContent = formatoMoneda(stats.total_ingresos || 0);
  statCitas.textContent = stats.total_citas || 0;
  statCliente.textContent = stats.cliente_frecuente
    ? `${stats.cliente_frecuente.nombre} (${stats.cliente_frecuente.visitas})`
    : "—";

  statServicios.innerHTML = (stats.servicios || [])
    .map(
      (item) => `
        <div class="fila-servicio">
          <span>${item.servicio}</span>
          <span>${item.cantidad}</span>
        </div>`,
    )
    .join("");

  estadisticas.hidden = false;
}

function renderDiasBloqueados(dias) {
  listaBloqueados.innerHTML = (dias || [])
    .map(
      (dia) => `
        <div class="fila-bloqueo">
          <span>${dia.blocked_date}${dia.reason ? " — " + dia.reason : ""}</span>
          <button type="button" class="desbloquear-dia" data-fecha="${dia.blocked_date}">Desbloquear</button>
        </div>`,
    )
    .join("");
  diasBloqueadosSection.hidden = false;
}

async function actualizarEstadisticas() {
  if (estadisticasEnCurso) return;
  estadisticasEnCurso = true;
  try {
    const { data, error } = await supabase.rpc("get_monthly_stats", { p_password: contraseñaActual });
    if (!error) mostrarEstadisticas(data);
  } catch {
    // Una falla en estadísticas no debe detener la lista de citas.
  } finally {
    estadisticasEnCurso = false;
  }
}

async function actualizarBloqueos() {
  if (bloqueosEnCurso) return;
  bloqueosEnCurso = true;
  try {
    const { data, error } = await supabase.rpc("get_blocked_dates", { p_password: contraseñaActual });
    if (!error) renderDiasBloqueados(data);
  } catch {
    // Una falla en días bloqueados no debe detener la lista de citas.
  } finally {
    bloqueosEnCurso = false;
  }
}

function actualizarDatosComplementarios() {
  void actualizarEstadisticas();
  void actualizarBloqueos();
}

async function cargarPanel({ silencioso = false } = {}) {
  if (cargaEnCurso) return false;
  cargaEnCurso = true;
  try {
    if (!silencioso) {
      estadoPanel.textContent = "Buscando citas...";
      avisoNuevas.hidden = true;
      tablaCitas.hidden = true;
      estadisticas.hidden = true;
      diasBloqueadosSection.hidden = true;
    }

  const { data, error } = await supabase.rpc("get_upcoming_appointments", {
    p_password: contraseñaActual,
  });

  if (error) {
    if (!silencioso) estadoPanel.textContent = "No se pudo cargar el panel. Revisa tu contraseña o conexión.";
    return false;
  }

  formulario.hidden = true;
  cerrarSesion.hidden = false;
  refrescar.hidden = false;

  if (data.length === 0) {
    estadoPanel.textContent = "No hay citas próximas";
    tablaCitas.innerHTML = "";
    tablaCitas.hidden = false;
    void actualizarDatosComplementarios();
    return true;
  }

  const vistas = obtenerCitasVistas(data);
  const nuevas = data.filter((cita) => !vistas.has(String(cita.id))).length;
  avisoNuevas.textContent = nuevas
    ? `${nuevas} cita${nuevas === 1 ? " nueva" : "s nuevas"} en este navegador. Revísalas en la lista.`
    : "";
  avisoNuevas.hidden = nuevas === 0;
  estadoPanel.textContent = "";
  tablaCitas.innerHTML = data
    .map(
      (cita) => {
        const id = String(cita.id);
        const esNueva = !vistas.has(id);
        return `
    <div class="fila-cita${esNueva ? " fila-cita-nueva" : ""}">
      <strong>${escaparHtml(cita.appointment_date)} · ${escaparHtml(formatoHora12(cita.start_time))}</strong>
      ${esNueva ? '<span class="etiqueta-nueva">Nueva en este navegador</span>' : ""}
      <p>${escaparHtml(cita.service_name)}</p>
      <p>${escaparHtml(cita.client_name)} — ${escaparHtml(cita.client_phone)}</p>
      ${esNueva ? `<button type="button" class="marcar-vista" data-id="${escaparHtml(id)}">Marcar vista</button>` : ""}
      <button type="button" class="cancelar-cita" data-id="${escaparHtml(id)}">Cancelar</button>
    </div>
  `;
      },
    )
    .join("");
  tablaCitas.hidden = false;
  void actualizarDatosComplementarios();
  return true;
  } finally {
    cargaEnCurso = false;
  }
}

function iniciarActualizacionAutomatica() {
  if (actualizacionAutomatica) return;
  actualizacionAutomatica = setInterval(() => {
    if (!document.hidden) cargarPanel({ silencioso: true });
  }, 30000);
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && actualizacionAutomatica) cargarPanel({ silencioso: true });
});

formulario.addEventListener("submit", async (event) => {
  event.preventDefault();
  contraseñaActual = clave.value;
  if (await cargarPanel()) iniciarActualizacionAutomatica();
});

cerrarSesion.addEventListener("click", () => location.reload());

refrescar.addEventListener("click", () => cargarPanel());

tablaCitas.addEventListener("click", async (event) => {
  const marcarVista = event.target.closest(".marcar-vista");
  if (marcarVista) {
    try {
      const vistas = new Set(JSON.parse(localStorage.getItem(claveVistas) || "[]"));
      vistas.add(marcarVista.dataset.id);
      localStorage.setItem(claveVistas, JSON.stringify([...vistas]));
      marcarVista.closest(".fila-cita").classList.remove("fila-cita-nueva");
      marcarVista.closest(".fila-cita").querySelector(".etiqueta-nueva").remove();
      marcarVista.remove();
      const restantes = tablaCitas.querySelectorAll(".marcar-vista").length;
      avisoNuevas.hidden = restantes === 0;
      avisoNuevas.textContent = restantes
        ? `${restantes} cita${restantes === 1 ? " nueva" : "s nuevas"} en este navegador. Revísalas en la lista.`
        : "";
    } catch {
      estadoPanel.textContent = "No se pudo guardar el estado de vista en este navegador.";
    }
    return;
  }

  const boton = event.target.closest(".cancelar-cita");
  if (!boton) return;

  const confirmar = confirm("¿Seguro que quieres cancelar esta cita?");
  if (!confirmar) return;

  const { error } = await supabase.rpc("cancel_appointment", {
    p_password: contraseñaActual,
    p_appointment_id: Number(boton.dataset.id),
  });

  if (error) {
    alert("No se pudo cancelar la cita.");
    return;
  }

  alert("Cita cancelada.");
  await cargarPanel();
});

formularioBloqueo.addEventListener("submit", async (event) => {
  event.preventDefault();

  const { error } = await supabase.rpc("block_date", {
    p_password: contraseñaActual,
    p_date: fechaBloqueo.value,
    p_reason: motivoBloqueo.value || null,
  });

  if (error) {
    alert("No se pudo bloquear el día.");
    return;
  }

  formularioBloqueo.reset();
  await cargarPanel();
});

listaBloqueados.addEventListener("click", async (event) => {
  const boton = event.target.closest(".desbloquear-dia");
  if (!boton) return;

  const { error } = await supabase.rpc("unblock_date", {
    p_password: contraseñaActual,
    p_date: boton.dataset.fecha,
  });

  if (error) {
    alert("No se pudo desbloquear el día.");
    return;
  }

  await cargarPanel();
});
