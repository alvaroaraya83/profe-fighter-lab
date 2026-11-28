# PROFE FIGHTER 0.4.0 — Motor estable

Base funcional: Alpha 10 aprobada. Los archivos de laboratorio 0.3.23 y Alpha 10 no se modifican.

## Arquitectura
- pf040-core.json: reglas y parámetros comunes, ataques convencionales y tiempos estándar.
- pf040-el-maestro.json: identidad, manifiesto de sprites, ataques especiales, tiempos propios, anclaje, hurtbox y datos de ULT01.
- boot.duel040stable.js: carga de configuración y normalización de sprites; carga el motor tras finalizar.
- engine.duel040stable.js: simulación fija 60 Hz, entradas, CPU, colisión, rondas, renderizado y entrenamiento.
- duel-040.html: entrada independiente.

## Contrato de personaje (schema 1)
IDs de animación comunes: idle, forward, back, run, dash, block, lowblock, crouch, jump, jab, kick, punch, heavykick, lowjab, uppercut, lowkick, sweep, airjab, airkick, airpunch, airheavykick, grab, grab2, hitLight, hitStrong, hitLow, hitGrab, dizzy, fallFront, fallBack, recoverFront, recoverBack. Los parámetros comunes se pueden sobreescribir con attacks/durations del perfil. Los fotogramas normalizados usan lienzo 320×280 y anclaje horizontal 160, suelo local 258. active usa índices desde cero; stun/stop/durations en ms; reach/y/h/knock en píxeles de escenario; damage en HP.

Kit maestro-v1: riff, muscle, smartGlasses, smoke, smokeFX, ultA–D, entranceA–D, victory, defeat. El motor aún contiene los controladores y efectos específicos de este kit. Para un kit nuevo se debe implementar y probar sus controladores; no basta crear un JSON. La carga actual selecciona un perfil compartido para ambos jugadores, no hay selector ni enfrentamientos mixtos todavía.

## Controles
P1: flechas, Espacio, J/K/U/I, O (agarre), P (GRB02), L (ULT). P2: A/D/W/S, F, C/V/B/N, M, H, R. Neutral jab+punch = GRB01; adelante + jab+punch = GRB02. Punch+heavykick = contundente. Doble atrás+jab = SPC01; doble abajo+punch = SPC02; doble adelante+jab = SPC03; doble abajo+kick = SPC04. Cuatro botones = ULT01. Mandos estándar A/B/X/Y, LB guardia, RB agarre, LT+RT ULT. Direcciones relativas al rival.

## Reglas
1000 HP, energía 0–100, 99 segundos, primero a dos rondas, empate sin punto. Entrenamiento sin reloj, vida/energía infinita opcionales. Especiales sin coste; ULT01 consume 100, 400 HP en cinco impactos. Sonido fuera del alcance de 0.4.0.

## Validación
Comparar con Alpha 10: entrada, rondas, CPU, HUD, controles, golpes, agarres, caídas, especiales, ULT, entrenamiento. Revisión visual y mandos físicos requieren navegador real. Los archivos JSON son configuración inicial del kit, no un sistema completo de plugins.
