# Contexto del proyecto — Collins Barber Shop

## Propósito de negocio

Este sitio es mi primer proyecto freelance pagado. El objetivo NO es solo
código funcional — es cerrar la venta con Collins, un barbero que
actualmente usa Beunik (una plataforma de terceros para reservas).

## Competencia: Beunik

Collins ya tiene reservas funcionando en Beunik, así que "agendar citas"
no es el diferenciador. Mi pitch de venta es:

- Identidad digital propia (dominio, no depender de una plataforma ajena)
- Visibilidad en Google (Beunik no lo posiciona en búsquedas locales)
- Panel de analíticas propio (ingresos, top cliente, comparativa mensual)
- Sin comisiones ni dependencia de terceros a futuro

Cualquier tarea que toque SEO, metadatos, rendimiento o contenido debe
reforzar esta ventaja frente a Beunik — es literalmente el argumento de venta.

## Stack técnico

- Frontend: HTML semántico, CSS (variables, Flexbox/Grid), JS vanilla
- Backend: Supabase (PostgreSQL), con constraint EXCLUDE USING gist
  para evitar doble-booking
- Deploy: GitHub Pages vía Git
- Tipografía: Playfair Display + Jost
- Estética: dark gold/black

## Reglas de trabajo

- No rompas el sistema de reservas en tiempo real ni el panel de admin
  protegido por contraseña (/panel.html) — ya funcionan en producción.
- Prioriza cambios que aceleren el cierre de venta sobre refactors
  cosméticos sin impacto de negocio.
- Antes de tocar CSS del layout general, revisa que no rompa el
  date-picker de 14 días generado por JS.
