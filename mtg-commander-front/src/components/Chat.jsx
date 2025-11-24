import { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

function Chat() {
  const { messages, sendMessage, playerName } = useGame();
  const [text, setText] = useState('');

  function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text);
    setText('');
  }

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className="chat-message">
            <strong>{m.from}: </strong>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="chat-form">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={playerName ? 'Digite uma mensagem...' : 'Defina seu nome na Home'}
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}

export default Chat;
