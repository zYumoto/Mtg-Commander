import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register(email, password, nickname);
      navigate("/lobby");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-center">
      <h2>Criar Conta</h2>
      <p>Registre-se para salvar decks e jogar com amigos.</p>

      <form onSubmit={handleSubmit} className="form-card">
        <label>
          Nickname:
          <input
            type="text"
            placeholder="Ex: VictorMTG"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>

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
            placeholder="Crie uma senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <p style={{ color: "#ff6b6b", fontSize: "0.85rem" }}>{error}</p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Criando conta..." : "Registrar"}
        </button>
      </form>

      <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </section>
  );
}

export default Register;
