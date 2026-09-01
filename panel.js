import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabasePublishableKey, supabaseUrl } from "./supabase-config.js";
const supabase = createClient(supabaseUrl, supabasePublishableKey);
const formulario = document.querySelector("#formulario-panel");
const clave = document.querySelector("#clave");
const estadoPanel = document.querySelector("#estado-panel");
const tablaCitas = document.querySelector("#tabla-citas");

formulario.addEventListener("submit", async (event) => {
  event.preventDefault();
  estadoPanel.textContent = "Buscando citas...";
  tablaCitas.hidden = true;

  const { data, error } = await supabase.rpc("get_upcoming_appointments", {
    p_password: clave.value,
  });

  if (error) {
    estadoPanel.textContent = "Contraseña incorrecta";
    return;
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
    <div>
      <strong>${cita.appointment_date} · ${cita.start_time.slice(0, 5)}</strong>
      <p>${cita.service_name}</p>
      <p>${cita.client_name} — ${cita.client_phone}</p>
    </div>
  `,
    )
    .join("");
  tablaCitas.hidden = false;
});
