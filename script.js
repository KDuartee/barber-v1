import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabasePublishableKey, supabaseUrl } from "./supabase-config.js";

const supabase = createClient(supabaseUrl, supabasePublishableKey);
const whatsapp = "526622978045";
const servicios = {
  "corte-hombre": { nombre: "Corte hombre", duracion: 30 },
  "corte-nino": { nombre: "Corte niño", duracion: 30 },
  "corte-barba": { nombre: "Corte con barba", duracion: 60 },
  barba: { nombre: "Barba", duracion: 30 },
  cejas: { nombre: "Cejas", duracion: 30 },
  "diseno-cejas": { nombre: "Diseño de cejas", duracion: 30 },
};

const dias = document.querySelector("#dias");
let fechaSeleccionada = null;
const formulario = document.querySelector("#formulario-reserva");
const servicio = document.querySelector("#servicio");
const horarios = document.querySelector("#horarios");
const selectorHorarios = document.querySelector("#selector-horarios");
const estadoReserva = document.querySelector("#estado-reserva");
const enlaceWhatsapp = document.querySelector("#enlace-whatsapp");
const seccionReserva = document.querySelector("#reservar");
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

async function crearHorarios() {
  const servicioElegido = servicios[servicio.value];

  if (!servicioElegido || !fechaSeleccionada) {
    selectorHorarios.hidden = true;
    return;
  }

  estadoReserva.textContent = "";
  horarios.innerHTML = "";
  horarioSeleccionado = "";
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
    boton.addEventListener("click", () =>
      seleccionarHorario(boton, textoHorario),
    );
    horarios.append(boton);
  });
}

function seleccionarHorario(boton, textoHorario) {
  document.querySelectorAll(".horario").forEach((horario) => {
    horario.classList.remove("seleccionado");
  });
  boton.classList.add("seleccionado");
  horarioSeleccionado = textoHorario;
}

function generarDias() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    const fechaDelBoton = new Date(hoy);
    fechaDelBoton.setDate(hoy.getDate() + i);

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "dia";
    const nombreDia = fechaDelBoton.toLocaleDateString("es-MX", {
      weekday: "short",
    });
    boton.innerHTML = `<span>${nombreDia}</span><strong>${fechaDelBoton.getDate()}</strong>`;

    if (fechaDelBoton.getDay() === 0) {
      boton.disabled = true;
      boton.title = "Cerrado los domingos";
    } else {
      boton.addEventListener("click", () =>
        seleccionarDia(boton, fechaDelBoton),
      );
    }

    dias.append(boton);
  }
}

function seleccionarDia(boton, fechaDelBoton) {
  document
    .querySelectorAll(".dia")
    .forEach((d) => d.classList.remove("seleccionado"));
  boton.classList.add("seleccionado");
  fechaSeleccionada = fechaDelBoton;
  crearHorarios();
}

servicio.addEventListener("change", crearHorarios);
generarDias();
document.querySelectorAll("[data-servicio]").forEach((boton) => {
  boton.addEventListener("click", () => {
    servicio.value = boton.dataset.servicio;
    crearHorarios();
    seccionReserva.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!horarioSeleccionado) {
    estadoReserva.textContent = "Elige un horario antes de continuar.";
    return;
  }
  if (!fechaSeleccionada) {
    estadoReserva.textContent = "Elige un día antes de continuar.";
    return;
  }

  const datos = new FormData(formulario);
  const servicioElegido = servicios[datos.get("servicio")];
  estadoReserva.textContent = "Guardando tu solicitud...";
  const { error } = await supabase.rpc("create_appointment", {
    p_service_id: datos.get("servicio"),
    p_client_name: datos.get("nombre"),
    p_client_phone: datos.get("telefono"),
    p_appointment_date: convertirFechaAISO(fechaSeleccionada),
    p_start_time: horarioSeleccionado,
  });

  if (error) {
    estadoReserva.textContent = error.message.includes("Ese horario")
      ? "Ese horario acaba de ser reservado. Elige otro."
      : "No pudimos guardar la cita. Intenta de nuevo.";
    crearHorarios();
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

  window.open(
    `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`,
    "_blank",
    "noopener",
  );
  formulario.reset();
  horarioSeleccionado = "";
  selectorHorarios.hidden = true;
  estadoReserva.textContent =
    "Solicitud registrada. Abrimos WhatsApp para avisar a Collins.";
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
