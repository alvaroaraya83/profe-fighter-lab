# PROFE FIGHTER — Combat Lab Web

Base: Combat Lab V0.3.2 (patada débil aérea aprobada).

## Publicación
Sube el contenido de esta carpeta (no el ZIP) a la raíz del repositorio `profe-fighter-lab`. En Settings → Pages elige Deploy from a branch, main, / (root). La URL real aparece en Pages. GitHub Pages normalmente es público; no subir material sin autorización.

## Prueba local
Desde esta carpeta: `python -m http.server 8000` y abrir `http://localhost:8000/`. No abrir index.html con doble clic.

## Actualizaciones
Cada movimiento tiene su archivo JSON de fotogramas originales. Para publicar una nueva versión, subir los archivos nuevos, el index.html si cambia la interfaz, y el version.json actualizado en el mismo commit. Los nombres de motor y sprites incluyen una huella de contenido: conservar archivos anteriores o eliminarlos solo si ya no están referenciados. No modificar los sprites aprobados. El navegador revisa version.json cada 15 segundos y al volver a la pestaña. Si hay una actualización, se recarga cuando el personaje está en reposo y no hay entradas recientes; la inspección de fotogramas no se interrumpe automáticamente. También puede actualizarse manualmente. La recarga reinicia el combate y los ajustes del laboratorio. No necesita claves ni servidor de aplicaciones.
