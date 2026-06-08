FONDOS DEL JUEGO — PLAZA 1810
=============================

Cada escena lee su fondo desde acá. Los nombres están cableados en el código
(game/plaza/PlazaScene.js y cada componente de minijuego). Respetá los nombres
exactos y no hay que tocar código.

Si falta un archivo, el juego usa un fondo de respaldo:
  - plaza.png        -> fondo procedural (degradé oscuro + grilla isométrica)
  - fondos minijuego -> degradé oscuro (MinigameLayout)


ARCHIVOS ESPERADOS
------------------

  Archivo         Escena / uso                       Tamaño reco.   Estado
  --------------- ---------------------------------- -------------- --------
  plaza.png       Hub isométrico (Plaza de Mayo)     1440x800+      OK
  pulperia.png    Minijuego naipes (La Pulpería)     1440x800       FALTA
  cabildo.png     Minijuego dados (El Cabildo)       1440x800       FALTA
  mercado.png     Minijuego cubiletes (El Mercado)   1440x800       FALTA
  feria.png       Minijuego sortija (La Feria)       1440x800       FALTA
  garito.png      Garito de la mafia (saldar deuda)  1440x800       FALTA


NOTAS DE TAMAÑO
---------------

- El canvas del hub es 1440x800 (apaisado). plaza.png se dibuja estirado a ese
  tamaño: mandá una imagen de ratio ~1.8:1 (ej 1440x800, 1920x1067, 2048x1138)
  para que no se deforme. La actual (2048x1168) anda bien.

- Los fondos de minijuego se muestran con CSS `background-size: cover` sobre un
  contenedor 1440x800, así que cubren toda el área (puede recortar bordes).
  Ratio ~1.8:1 también es lo ideal.


PENDIENTE
---------

Se planea un 5º minijuego (6º edificio). Cuando se defina, va a necesitar su
propio fondo acá (ej: <nombre>.png) y registrarse en el código. Ver CLAUDE.md.
