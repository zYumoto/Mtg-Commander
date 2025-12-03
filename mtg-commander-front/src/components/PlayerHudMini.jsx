// src/components/PlayerHudMini.jsx
import React from "react";

/**
 * Mini HUD:
 * - Comandante maior à esquerda
 * - Permanentes em uma fileira
 * - Lands em outra fileira
 * - Tudo em miniatura e alinhado, sem cortes
 */
function PlayerHudMini({ player }) {
  if (!player) return null;

  const commander = player.commanderCard || null;
  const battlefield = Array.isArray(player.battlefield) ? player.battlefield : [];
  const lands = Array.isArray(player.lands) ? player.lands : [];

  // limita pra não entupir o mini
  const battlefieldRow = battlefield.slice(0, 5);
  const landsRow = lands.slice(0, 5);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* container interno */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        {/* ================= COMANDANTE À ESQUERDA ================= */}
        {commander && (
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={
                commander.image_uris?.small ||
                commander.image_uris?.normal ||
                ""
              }
              alt={commander.name}
              style={{
                width: 70,         // tamanho do comandante
                height: "auto",
                borderRadius: 4,
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        )}

        {/* ============ PERMANENTES + LANDS EM DUAS FILEIRAS ============ */}
        <div
          style={{
            flex: "0 1 auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxWidth: "100%",
          }}
        >
          {/* PERMANENTES (linha de cima) */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 4,
              justifyContent: "flex-start",
              alignItems: "center",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {battlefieldRow.map((card) => (
              <img
                key={card.instanceId}
                src={
                  card.image_uris?.small ||
                  card.image_uris?.normal ||
                  ""
                }
                alt={card.name}
                style={{
                  width: 40,      // tamanho permanentes
                  height: "auto",
                  borderRadius: 3,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ))}
          </div>

          {/* LANDS (linha de baixo) */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 4,
              justifyContent: "flex-start",
              alignItems: "center",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {landsRow.map((card) => (
              <img
                key={card.instanceId}
                src={
                  card.image_uris?.small ||
                  card.image_uris?.normal ||
                  ""
                }
                alt={card.name}
                style={{
                  width: 40,      // tamanho lands (igual permanentes)
                  height: "auto",
                  borderRadius: 3,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerHudMini;
