# language: es
# Escenario base de la plantilla (@plantilla): no cuenta en el % de avance del alcance.
# @smoke: corre también contra producción después de cada deploy.
Característica: Página de inicio

  @plantilla @smoke
  Escenario: La página muestra el nombre del proyecto
    Dado que abro la página de inicio
    Entonces veo el nombre del proyecto como título
