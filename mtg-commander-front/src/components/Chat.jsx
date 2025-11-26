import React, { useEffect, useRef, useState } from "react";
import { useGame } from "../context/GameContext.jsx";

function Chat() {
  const { messages = [], sendMessage, playerName } = useGame();
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // Auto-scroll pro fim quando chegam novas mensagens
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat da mesa</h3>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Nenhuma mensagem ainda. Diga um oi! 👋</p>
        )}

        {messages.map((msg) => {
          const isMe = msg.from === playerName;
          const fromLabel = isMe ? "Você" : msg.from || "Anônimo";

          return (
            <div
              key={msg.id}
              className={`chat-row ${isMe ? "chat-row-me" : "chat-row-other"}`}
            >
              <div
                className={`chat-bubble ${
                  isMe ? "chat-bubble-me" : "chat-bubble-other"
                }`}
              >
                <div className="chat-from">{fromLabel}</div>
                <div className="chat-text">{msg.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Digite uma mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}

export default Chat;
