import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useGame } from "../context/GameContext.jsx";

function Login() {
  const { login } = useAuth();
  const { setPlayerName } = useGame();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      setPlayerName("");
      navigate("/lobby");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-center">
      <h2>Login</h2>
      <p>Entre para acessar o lobby e seus decks.</p>

      <form onSubmit={handleSubmit} className="form-card">
        <label>
          E-mail:
          <input
            type="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label>
          Senha:
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <p style={{ color: "#ff6b6b", fontSize: "0.85rem" }}>{error}</p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
        <Link to="/forgot-password">Esqueci minha senha</Link>
      </p>

      <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
        Nao tem conta? <Link to="/register">Registrar</Link>
      </p>
    </section>
  );
}

export default Login;
