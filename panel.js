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

let contraseñaActual = "";

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

async function cargarPanel() {
  estadoPanel.textContent = "Buscando citas...";
  tablaCitas.hidden = true;
  estadisticas.hidden = true;
  diasBloqueadosSection.hidden = true;

  const { data, error } = await supabase.rpc("get_upcoming_appointments", {
    p_password: contraseñaActual,
  });

  if (error) {
    estadoPanel.textContent = "Contraseña incorrecta";
    return;
  }

  formulario.hidden = true;
  cerrarSesion.hidden = false;
  refrescar.hidden = false;

  const { data: stats, error: statsError } = await supabase.rpc(
    "get_monthly_stats",
    {
      p_password: contraseñaActual,
    },
  );

  if (!statsError) {
    mostrarEstadisticas(stats);
  }

  const { data: bloqueados, error: bloqueadosError } = await supabase.rpc(
    "get_blocked_dates",
    {
      p_password: contraseñaActual,
    },
  );

  if (!bloqueadosError) {
    renderDiasBloqueados(bloqueados);
  }

  if (data.length === 0) {
    estadoPanel.textContent = "No hay citas próximas";
    tablaCitas.innerHTML = "";
    tablaCitas.hidden = false;
    return;
  }

  estadoPanel.textContent = "";
  tablaCitas.innerHTML = data
    .map(
      (cita) => `
    <div class="fila-cita">
      <strong>${cita.appointment_date} · ${formatoHora12(cita.start_time)}</strong>
      <p>${cita.service_name}</p>
      <p>${cita.client_name} — ${cita.client_phone}</p>
      <button type="button" class="cancelar-cita" data-id="${cita.id}">Cancelar</button>
    </div>
  `,
    )
    .join("");
  tablaCitas.hidden = false;
}

formulario.addEventListener("submit", async (event) => {
  event.preventDefault();
  contraseñaActual = clave.value;
  await cargarPanel();
});

cerrarSesion.addEventListener("click", () => location.reload());

refrescar.addEventListener("click", () => cargarPanel());

tablaCitas.addEventListener("click", async (event) => {
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
