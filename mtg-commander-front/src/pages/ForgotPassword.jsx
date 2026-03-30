import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../config.js";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    setDevLink("");

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          "O backend nao respondeu JSON. Reinicie o servidor da API e tente novamente."
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Erro ao solicitar recuperacao");
      }

      setMessage(
        data.message ||
          "Se o email existir na base, enviaremos um link de recuperacao."
      );
      if (data.devResetLink) {
        setDevLink(data.devResetLink);
      }
    } catch (err) {
      setError(err.message || "Erro ao solicitar recuperacao");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-center">
      <h2>Recuperar Senha</h2>
      <p>Informe seu e-mail para receber um link de redefinicao.</p>

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

        {error && <p style={{ color: "#ff6b6b", fontSize: "0.85rem" }}>{error}</p>}
        {message && <p style={{ color: "#9fe870", fontSize: "0.85rem" }}>{message}</p>}
        {devLink && (
          <p style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
            Link de desenvolvimento: <a href={devLink}>{devLink}</a>
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar link"}
        </button>
      </form>

      <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
        Lembrou a senha? <Link to="/login">Voltar para login</Link>
      </p>
    </section>
  );
}

export default ForgotPassword;
