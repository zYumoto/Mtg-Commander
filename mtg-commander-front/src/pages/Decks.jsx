import React from "react";
import "./DecksPage.css";

export default function Decks() {
  const decks = []; 
  return (
    <div className="deckspage">
      <div className="deckspage__wrap">
        <div className="deckspage__grid">
          {/* MAIN */}
          <main className="deckspage__main">
            <div className="deckspage__mainInner">
              <div className="deckspage__titlePill">Decks</div>

              <section className="deckspage__content">
                {decks.length === 0 ? (
                  <div className="deckspage__empty">
                    <div className="deckspage__emptyCard">
                      <div className="deckspage__emptyTitle">
                        Nenhum deck criado
                      </div>
                      <div className="deckspage__emptyText">
                        Crie um deck para começar a jogar Commander.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="deckspage__gridCards">
                    {decks.map((deck) => (
                      <button key={deck.id} className="deckspage__deckCard">
                        <div className="deckspage__commanderSlot">
                          {/* imagem do comandante */}
                        </div>
                        <div className="deckspage__deckName">
                          {deck.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>

          {/* SIDEBAR (mesmo padrão do Lobby) */}
          <aside className="deckspage__side">
            <div className="deckspage__sideInner">
              <div className="deckspage__profileRow">
                <div className="deckspage__avatar">OT</div>
                <div className="deckspage__nickPill">NICKNAME</div>
              </div>

              <button className="deckspage__sideBtn">MEUS DECKS</button>

              <div className="deckspage__friendsBox">
                <div className="deckspage__friendsHeader">Amigos</div>
                <div className="deckspage__friendsEmpty">
                  Nenhum amigo online
                </div>
              </div>

              <button className="deckspage__settingsBtn">
                CONFIGURAÇÕES
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
