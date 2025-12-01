import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

function Profile() {
  const { user, loading, updateProfile, changePassword } = useAuth();

  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || "");
      setFullName(user.fullName || "");
      setAvatarUrl(user.avatarUrl || "");
      setBio(user.bio || "");
    }
  }, [user]);

  if (loading && !user) {
    return <div className="page-center">Carregando...</div>;
  }

  if (!user) {
    return (
      <section className="page-center">
        <h1>Perfil</h1>
        <p>Você precisa estar logado para editar seu perfil.</p>
      </section>
    );
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMessage("");
    setSavingProfile(true);
    try {
      await updateProfile({ nickname, fullName, avatarUrl, bio });
      setProfileMessage("Perfil atualizado com sucesso!");
    } catch (err) {
      setProfileMessage(err.message || "Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMessage("");
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordMessage(err.message || "Erro ao trocar senha");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <section className="page-center profile-page">
      <h1>Meu perfil</h1>

      <div className="profile-layout">
        <form onSubmit={handleSaveProfile} className="form-card">
          <h2>Informações básicas</h2>

          <label>
            Apelido (nome no jogo)
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: zYumoto"
            />
          </label>

          <label>
            Nome completo
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Opcional"
            />
          </label>

          <label>
            URL da foto de perfil
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Cole aqui o link de uma imagem"
            />
          </label>

          <label>
            Sobre você
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Algumas informações rápidas sobre você"
              rows={3}
            />
          </label>

          <button type="submit" disabled={savingProfile}>
            {savingProfile ? "Salvando..." : "Salvar perfil"}
          </button>

          {profileMessage && <p className="feedback-text">{profileMessage}</p>}
        </form>

        <form onSubmit={handleChangePassword} className="form-card">
          <h2>Trocar senha</h2>

          <label>
            Senha atual
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>

          <label>
            Nova senha
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <button type="submit" disabled={changingPassword}>
            {changingPassword ? "Trocando..." : "Atualizar senha"}
          </button>

          {passwordMessage && (
            <p className="feedback-text">{passwordMessage}</p>
          )}
        </form>
      </div>
    </section>
  );
}

export default Profile;
