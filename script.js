import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabasePublishableKey, supabaseUrl } from "./supabase-config.js";

const supabase = createClient(supabaseUrl, supabasePublishableKey);
const whatsapp = "526622978045";
const servicios = {
  "corte-hombre": { nombre: "Corte hombre", duracion: 30, precio: 200 },
  "corte-nino": { nombre: "Corte niño", duracion: 30, precio: 170 },
  "corte-barba": { nombre: "Corte con barba", duracion: 60, precio: 300 },
  barba: { nombre: "Barba", duracion: 30, precio: 150 },
  cejas: { nombre: "Cejas", duracion: 30, precio: 50 },
  "diseno-cejas": { nombre: "Diseño de cejas", duracion: 30, precio: 50 },
};

const dias = document.querySelector("#dias");
const estadoDias = document.querySelector("#estado-dias");
const reintentarDias = document.querySelector("#reintentar-dias");
const avisosBloqueos = document.querySelector("#avisos-bloqueos");
let fechaSeleccionada = null;
let fechasBloqueadas = new Map();
let bloqueosListos = false;
let versionBloqueos = 0;
const formulario = document.querySelector("#formulario-reserva");
const servicio = document.querySelector("#servicio");
const horarios = document.querySelector("#horarios");
const selectorHorarios = document.querySelector("#selector-horarios");
const estadoReserva = document.querySelector("#estado-reserva");
const enlaceWhatsapp = document.querySelector("#enlace-whatsapp");
const seccionReserva = document.querySelector("#reservar");
const resumenReserva = document.querySelector("#resumen-reserva");
const resumenServicio = document.querySelector("#resumen-servicio");
const resumenFecha = document.querySelector("#resumen-fecha");
const resumenHora = document.querySelector("#resumen-hora");
const botonReservar = document.querySelector("#boton-reservar");
const comprobante = document.querySelector("#comprobante-reserva");
const comprobanteServicio = document.querySelector("#comprobante-servicio");
const comprobanteFecha = document.querySelector("#comprobante-fecha");
const comprobanteHora = document.querySelector("#comprobante-hora");
const comprobanteWhatsapp = document.querySelector("#comprobante-whatsapp");
let horarioSeleccionado = "";
let versionHorarios = 0;

function convertirFechaAISO(fechaElegida) {
  const anio = fechaElegida.getFullYear();
  const mes = String(fechaElegida.getMonth() + 1).padStart(2, "0");
  const dia = String(fechaElegida.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
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

function actualizarResumen() {
  const servicioElegido = servicios[servicio.value];
  resumenReserva.hidden = !servicioElegido;

  if (!servicioElegido) return;

  resumenServicio.textContent = `${servicioElegido.nombre} · $${servicioElegido.precio} MXN`;
  resumenFecha.textContent = fechaSeleccionada
    ? fechaSeleccionada.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "Pendiente";
  resumenHora.textContent = horarioSeleccionado
    ? formatoHora12(horarioSeleccionado)
    : "Pendiente";
}

async function crearHorarios() {
  const servicioElegido = servicios[servicio.value];

  if (
    !servicioElegido ||
    !fechaSeleccionada ||
    !bloqueosListos ||
    fechasBloqueadas.has(convertirFechaAISO(fechaSeleccionada))
  ) {
    selectorHorarios.hidden = true;
    return;
  }

  estadoReserva.textContent = "";
  horarios.innerHTML = "";
  horarioSeleccionado = "";
  actualizarResumen();
  selectorHorarios.hidden = false;

  const solicitudActual = ++versionHorarios;
  estadoReserva.textContent = "Buscando horarios disponibles...";
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_service_id: servicio.value,
    p_appointment_date: convertirFechaAISO(fechaSeleccionada),
  });

  if (solicitudActual !== versionHorarios) return;

  if (error) {
    selectorHorarios.hidden = true;
    estadoReserva.textContent =
      "No pudimos consultar los horarios. Intenta de nuevo.";
    return;
  }

  if (data.length === 0) {
    selectorHorarios.hidden = true;
    estadoReserva.textContent =
      "No quedan horarios disponibles para esa fecha.";
    return;
  }

  estadoReserva.textContent = "";
  data.forEach(({ slot }) => {
    const textoHorario = slot.slice(0, 5);
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "horario";
    boton.textContent = formatoHora12(textoHorario);
    boton.setAttribute("aria-pressed", "false");
    boton.addEventListener("click", () =>
      seleccionarHorario(boton, textoHorario),
    );
    horarios.append(boton);
  });
}

function seleccionarHorario(boton, textoHorario) {
  document.querySelectorAll(".horario").forEach((horario) => {
    horario.classList.remove("seleccionado");
    horario.setAttribute("aria-pressed", "false");
  });
  boton.classList.add("seleccionado");
  boton.setAttribute("aria-pressed", "true");
  horarioSeleccionado = textoHorario;
  actualizarResumen();
}

function generarDias() {
  dias.replaceChildren();
  avisosBloqueos.replaceChildren();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    const fechaDelBoton = new Date(hoy);
    fechaDelBoton.setDate(hoy.getDate() + i);

    const boton = document.createElement("button");
    const fechaISO = convertirFechaAISO(fechaDelBoton);
    const bloqueo = fechasBloqueadas.get(fechaISO);
    boton.type = "button";
    boton.className = "dia";
    boton.setAttribute("aria-pressed", "false");
    const nombreDia = fechaDelBoton.toLocaleDateString("es-MX", {
      weekday: "short",
    });
    boton.innerHTML = `<span>${nombreDia}</span><strong>${fechaDelBoton.getDate()}</strong>`;
    boton.setAttribute(
      "aria-label",
      fechaDelBoton.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );

    if (!bloqueosListos) {
      boton.disabled = true;
      boton.title = "Consultando disponibilidad";
    } else if (bloqueo) {
      boton.disabled = true;
      boton.classList.add("dia-bloqueado");
      boton.title = bloqueo.reason || "Día no disponible";
      boton.setAttribute("aria-label", `${boton.getAttribute("aria-label")}. No disponible${bloqueo.reason ? ": " + bloqueo.reason : ""}`);
      const etiqueta = document.createElement("span");
      etiqueta.className = "dia-estado";
      etiqueta.textContent = "Cerrado";
      boton.append(etiqueta);

      const aviso = document.createElement("li");
      const fechaLegible = fechaDelBoton.toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long",
      });
      aviso.textContent = `${fechaLegible}: ${bloqueo.reason || "No disponible"}`;
      avisosBloqueos.append(aviso);
    } else if (fechaDelBoton.getDay() === 0) {
      boton.disabled = true;
      boton.title = "Cerrado los domingos";
    } else {
      boton.addEventListener("click", () =>
        seleccionarDia(boton, fechaDelBoton),
      );
      if (fechaSeleccionada && convertirFechaAISO(fechaSeleccionada) === fechaISO) {
        boton.classList.add("seleccionado");
        boton.setAttribute("aria-pressed", "true");
      }
    }

    dias.append(boton);
  }
  avisosBloqueos.hidden = avisosBloqueos.childElementCount === 0;
}

function seleccionarDia(boton, fechaDelBoton) {
  if (boton.disabled || fechasBloqueadas.has(convertirFechaAISO(fechaDelBoton))) return;
  document
    .querySelectorAll(".dia")
    .forEach((d) => {
      d.classList.remove("seleccionado");
      d.setAttribute("aria-pressed", "false");
    });
  boton.classList.add("seleccionado");
  boton.setAttribute("aria-pressed", "true");
  fechaSeleccionada = fechaDelBoton;
  horarioSeleccionado = "";
  actualizarResumen();
  crearHorarios();
}

async function cargarDiasBloqueados() {
  const solicitudActual = ++versionBloqueos;
  estadoDias.textContent = "Consultando días disponibles...";
  reintentarDias.hidden = true;

  try {
    const { data, error } = await supabase.rpc("get_public_blocked_dates");
    if (solicitudActual !== versionBloqueos) return;
    if (error) throw error;

    fechasBloqueadas = new Map((data || []).map((dia) => [dia.blocked_date, dia]));
    bloqueosListos = true;
    if (fechaSeleccionada && fechasBloqueadas.has(convertirFechaAISO(fechaSeleccionada))) {
      fechaSeleccionada = null;
      horarioSeleccionado = "";
      versionHorarios++;
      horarios.replaceChildren();
      selectorHorarios.hidden = true;
      estadoReserva.textContent = "El día elegido ya no está disponible. Selecciona otro.";
      actualizarResumen();
    }
    generarDias();
    estadoDias.textContent = "";
    if (fechaSeleccionada) void crearHorarios();
  } catch {
    if (solicitudActual !== versionBloqueos) return;
    estadoDias.textContent = "No pudimos comprobar los días cerrados. Intenta de nuevo.";
    reintentarDias.hidden = false;
  }
}

servicio.addEventListener("change", () => {
  crearHorarios();
  actualizarResumen();
});
generarDias();
void cargarDiasBloqueados();
reintentarDias.addEventListener("click", () => void cargarDiasBloqueados());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void cargarDiasBloqueados();
});
document.querySelectorAll("[data-servicio]").forEach((boton) => {
  boton.addEventListener("click", () => {
    servicio.value = boton.dataset.servicio;
    crearHorarios();
    actualizarResumen();
    seccionReserva.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (botonReservar.disabled) return;

  if (!horarioSeleccionado) {
    estadoReserva.textContent = "Elige un horario antes de continuar.";
    return;
  }
  if (!fechaSeleccionada) {
    estadoReserva.textContent = "Elige un día antes de continuar.";
    return;
  }
  if (!bloqueosListos || fechasBloqueadas.has(convertirFechaAISO(fechaSeleccionada))) {
    estadoReserva.textContent = "Ese día no está disponible. Elige otro.";
    return;
  }

  const datos = new FormData(formulario);
  const servicioElegido = servicios[datos.get("servicio")];
  botonReservar.disabled = true;
  botonReservar.textContent = "Guardando cita...";
  estadoReserva.textContent = "Guardando tu cita...";

  try {
    const { error } = await supabase.rpc("create_appointment", {
      p_service_id: datos.get("servicio"),
      p_client_name: datos.get("nombre"),
      p_client_phone: datos.get("telefono"),
      p_appointment_date: convertirFechaAISO(fechaSeleccionada),
      p_start_time: horarioSeleccionado,
    });

    if (error) {
      if (error.message.includes("Día bloqueado")) {
        fechaSeleccionada = null;
        horarioSeleccionado = "";
        versionHorarios++;
        selectorHorarios.hidden = true;
        horarios.replaceChildren();
        actualizarResumen();
        await cargarDiasBloqueados();
        estadoReserva.textContent = "Collins acaba de bloquear ese día. Elige otro.";
        return;
      }
      estadoReserva.textContent = error.message.includes("Ese horario")
        ? "Ese horario acaba de ser reservado. Elige otro."
        : "No pudimos guardar la cita. Intenta de nuevo.";
      await crearHorarios();
      return;
    }

    const mensaje = [
      "Hola, acabo de solicitar una cita en Collins Barber Shop.",
      `Servicio: ${servicioElegido.nombre}`,
      `Fecha: ${fechaSeleccionada.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
      `Hora solicitada: ${formatoHora12(horarioSeleccionado)}`,
      `Nombre: ${datos.get("nombre")}`,
      `Mi WhatsApp: ${datos.get("telefono")}`,
    ].join("\n");

    comprobanteServicio.textContent = `${servicioElegido.nombre} · $${servicioElegido.precio} MXN`;
    comprobanteFecha.textContent = fechaSeleccionada.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    comprobanteHora.textContent = formatoHora12(horarioSeleccionado);
    comprobanteWhatsapp.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;
    comprobante.hidden = false;
    formulario.reset();
    document.querySelectorAll(".dia").forEach((dia) => {
      dia.classList.remove("seleccionado");
      dia.setAttribute("aria-pressed", "false");
    });
    fechaSeleccionada = null;
    horarioSeleccionado = "";
    selectorHorarios.hidden = true;
    actualizarResumen();
    estadoReserva.textContent = "Tu cita se registró correctamente.";
    comprobante.focus();
  } catch {
    estadoReserva.textContent =
      "No pudimos conectar con el sistema de citas. Intenta de nuevo.";
  } finally {
    botonReservar.disabled = false;
    botonReservar.textContent = "Solicitar cita";
  }
});

const mensajeDomicilio =
  "Hola, quiero solicitar un servicio a domicilio en Collins Barber Shop.";
enlaceWhatsapp.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensajeDomicilio)}`;
enlaceWhatsapp.target = "_blank";
enlaceWhatsapp.rel = "noopener noreferrer";

document.querySelectorAll(".enlace-domicilio").forEach((enlace) => {
  enlace.href = enlaceWhatsapp.href;
  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";
});
