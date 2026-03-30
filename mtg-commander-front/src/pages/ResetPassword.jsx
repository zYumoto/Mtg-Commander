import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "../config.js";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Link de recuperacao invalido.");
      return;
    }

    if (newPassword.length < 4) {
      setError("A nova senha precisa ter pelo menos 4 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas nao conferem.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
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
        throw new Error(data.error || "Erro ao redefinir senha");
      }

      setMessage(data.message || "Senha redefinida com sucesso.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message || "Erro ao redefinir senha");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-center">
      <h2>Definir Nova Senha</h2>
      <p>Escolha uma nova senha para sua conta.</p>

      <form onSubmit={handleSubmit} className="form-card">
        <label>
          Nova senha:
          <input
            type="password"
            placeholder="Digite a nova senha"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>

        <label>
          Confirmar nova senha:
          <input
            type="password"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>

        {error && <p style={{ color: "#ff6b6b", fontSize: "0.85rem" }}>{error}</p>}
        {message && <p style={{ color: "#9fe870", fontSize: "0.85rem" }}>{message}</p>}

        <button type="submit" disabled={submitting || !token}>
          {submitting ? "Salvando..." : "Redefinir senha"}
        </button>
      </form>

      <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
        <Link to="/login">Voltar para login</Link>
      </p>
    </section>
  );
}

export default ResetPassword;
