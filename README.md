# Glicko-Related
---

Servidor de actualización de puntuaciones y desviaciones de los usuarios que se encuentren en la base de datos gestionada por el [servidor de _matchmaking_] creado por HoracioStudios. Este servidor de actualización usa como base el sistema de clasificación Glicko.

[servidor de _matchmaking_]: https://github.com/HoracioStudios/Matchmaking-Server

## Información sobre la implementación

Para modificar el tiempo de actualización del servidor se debe cambiar la variable `waitTimeMS` cuya magnitud esta en milisegundos.
Por defecto, la puntuación tiene un valor de 1500 y la desviación tiene un valor de 350.