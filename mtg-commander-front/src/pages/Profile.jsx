import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import ImageModal from "../components/ImageModal.jsx";

function Profile() {
  const { user, loading, updateProfile, changePassword } = useAuth();

  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bio, setBio] = useState("");

  const [previewImage, setPreviewImage] = useState(null);

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
      setBannerUrl(user.bannerUrl || "");
      setBio(user.bio || "");
    }
  }, [user]);

  // (opcional) fechar com ESC
  useEffect(() => {
    if (!previewImage) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setPreviewImage(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

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

  const displayName =
    nickname || user.nickname || user.fullName || user.email;

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMessage("");
    setSavingProfile(true);
    try {
      await updateProfile({
        nickname,
        fullName,
        avatarUrl,
        bannerUrl,
        bio,
      });
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
    <section className="profile-page">
      {/* ===== HERO ESTILO STEAM ===== */}
      <div className="profile-hero">
        {/* banner borrado de fundo */}
        <div
          className="profile-hero-banner"
          style={
            bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined
          }
          onClick={() => bannerUrl && setPreviewImage(bannerUrl)}
        />
        <div className="profile-hero-gradient" />

        <div className="profile-hero-inner">
          {/* avatar grande */}
          <div
            className="profile-hero-avatar"
            onClick={() => avatarUrl && setPreviewImage(avatarUrl)}
            style={{ cursor: avatarUrl ? "zoom-in" : "default" }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span>{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* nome + bio + botão editar */}
          <div className="profile-hero-main">
            <div className="profile-hero-text">
              <h1>{displayName}</h1>
              {fullName && <p className="profile-hero-sub">{fullName}</p>}
              {bio && <p className="profile-hero-bio">{bio}</p>}
            </div>

            <div className="profile-hero-actions">
              <span className="profile-hero-label">
                Seu perfil Commander Online
              </span>
              <a href="#profile-edit" className="btn-deck">
                Editar perfil
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FORMULÁRIOS ===== */}
      <div className="profile-layout" id="profile-edit">
        {/* Coluna 1 – dados básicos */}
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
              placeholder="Cole aqui o link de uma imagem quadrada"
            />
          </label>

          <label>
            URL do banner de perfil
            <input
              type="text"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="Imagem larga para o fundo do perfil"
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

          {profileMessage && (
            <p className="feedback-text">{profileMessage}</p>
          )}
        </form>

        {/* Coluna 2 – troca de senha */}
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

      {/* ===== MODAL DE IMAGEM ===== */}
      {previewImage && (
        <ImageModal
          url={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </section>
  );
}

export default Profile;
