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

function formatoMoneda(numero) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(numero);
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

formulario.addEventListener("submit", async (event) => {
  event.preventDefault();
  estadoPanel.textContent = "Buscando citas...";
  tablaCitas.hidden = true;
  estadisticas.hidden = true;

  const { data, error } = await supabase.rpc("get_upcoming_appointments", {
    p_password: clave.value,
  });

  if (error) {
    estadoPanel.textContent = "Contraseña incorrecta";
    return;
  }

  formulario.hidden = true;
  cerrarSesion.hidden = false;

  const { data: stats, error: statsError } = await supabase.rpc(
    "get_monthly_stats",
    {
      p_password: clave.value,
    },
  );

  if (!statsError) {
    mostrarEstadisticas(stats);
  }

  if (data.length === 0) {
    estadoPanel.textContent = "No hay citas próximas";
    tablaCitas.hidden = false;
    return;
  }

  estadoPanel.textContent = "";
  tablaCitas.innerHTML = data
    .map(
      (cita) => `
    <div class="fila-cita">
      <strong>${cita.appointment_date} · ${cita.start_time.slice(0, 5)}</strong>
      <p>${cita.service_name}</p>
      <p>${cita.client_name} — ${cita.client_phone}</p>
    </div>
  `,
    )
    .join("");
  tablaCitas.hidden = false;
});

cerrarSesion.addEventListener("click", () => location.reload());
