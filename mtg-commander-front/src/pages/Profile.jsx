import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ImageModal from "../components/ImageModal.jsx";
import ImageCropModal from "../components/ImageCropModal.jsx";
import { API_URL } from "../config.js";

const BIO_MAX_LENGTH = 100;
const TITLE_MAX_LENGTH = 40;
const WINS_MAX = 9999;

function Profile() {
  const navigate = useNavigate();
  const { user, token, loading, updateProfile, changePassword } = useAuth();

  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bio, setBio] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [victoryCount, setVictoryCount] = useState("0");
  const [showcaseImageUrl, setShowcaseImageUrl] = useState("");
  const [featuredDeckId, setFeaturedDeckId] = useState("");

  const [previewImage, setPreviewImage] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSource, setCropperSource] = useState("");
  const [cropperTarget, setCropperTarget] = useState("avatar");
  const [decks, setDecks] = useState([]);
  const [decksLoading, setDecksLoading] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    setNickname(user.nickname || "");
    setFullName(user.fullName || "");
    setAvatarUrl(user.avatarUrl || "");
    setBannerUrl(user.bannerUrl || "");
    setBio(user.bio || "");
    setCustomTitle(user.customTitle || "");
    setVictoryCount(String(user.victoryCount ?? 0));
    setShowcaseImageUrl(user.showcaseImageUrl || "");
    setFeaturedDeckId(user.featuredDeckId || "");
  }, [user]);

  useEffect(() => {
    if (!token) return;

    let ignore = false;

    async function loadDecks() {
      try {
        setDecksLoading(true);
        const res = await fetch(`${API_URL}/decks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erro ao carregar decks");
        }
        if (!ignore) {
          setDecks(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Erro ao carregar decks do perfil:", err);
        if (!ignore) {
          setDecks([]);
        }
      } finally {
        if (!ignore) {
          setDecksLoading(false);
        }
      }
    }

    loadDecks();

    return () => {
      ignore = true;
    };
  }, [token]);

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

  useEffect(() => {
    if (!settingsOpen) return;

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setSettingsOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  if (loading && !user) {
    return <div className="page-center">Carregando...</div>;
  }

  if (!user) {
    return (
      <section className="page-center">
        <h1>Perfil</h1>
        <p>Voce precisa estar logado para editar seu perfil.</p>
      </section>
    );
  }

  const displayName =
    nickname || user.nickname || user.fullName || user.email || "Jogador";
  const normalizedWins = Math.max(
    0,
    Math.min(WINS_MAX, Number.parseInt(victoryCount || "0", 10) || 0)
  );
  const featuredDeck =
    decks.find((deck) => String(deck._id) === String(featuredDeckId)) || null;

  function withMediaVersion(url) {
    if (!url || url.startsWith("data:")) return url;
    const version = user?.updatedAt || "1";
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${encodeURIComponent(version)}`;
  }

  const avatarSrc = withMediaVersion(avatarUrl);
  const bannerSrc = withMediaVersion(bannerUrl);
  const showcaseSrc = withMediaVersion(showcaseImageUrl);
  const settingsPreviewMedia = [
    {
      key: "avatar",
      title: "Avatar",
      description: "Quadrado, ideal para sua identidade na mesa.",
      image: avatarSrc,
      onRemove: () => setAvatarUrl(""),
    },
    {
      key: "banner",
      title: "Banner",
      description: "Faixa panoramica para abrir o seu perfil.",
      image: bannerSrc,
      onRemove: () => setBannerUrl(""),
    },
    {
      key: "showcase",
      title: "Foto personalizada",
      description: "Imagem principal da vitrine do comandante.",
      image: showcaseSrc,
      onRemove: () => setShowcaseImageUrl(""),
    },
  ];

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMessage("");

    if (bio.length > BIO_MAX_LENGTH) {
      setProfileMessage(
        `Sobre voce deve ter no maximo ${BIO_MAX_LENGTH} caracteres.`
      );
      return;
    }

    if (customTitle.length > TITLE_MAX_LENGTH) {
      setProfileMessage(
        `Titulo deve ter no maximo ${TITLE_MAX_LENGTH} caracteres.`
      );
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        nickname,
        fullName,
        avatarUrl,
        bannerUrl,
        bio,
        customTitle,
        victoryCount: normalizedWins,
        showcaseImageUrl,
        featuredDeckId: featuredDeckId || "",
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

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePickImage(target, file) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setCropperTarget(target);
    setCropperSource(dataUrl);
    setCropperOpen(true);
  }

  function applyCroppedImage(imageDataUrl) {
    if (cropperTarget === "avatar") {
      setAvatarUrl(imageDataUrl);
    } else if (cropperTarget === "banner") {
      setBannerUrl(imageDataUrl);
    } else {
      setShowcaseImageUrl(imageDataUrl);
    }

    setCropperOpen(false);
    setCropperSource("");
  }

  return (
    <section className="profile-page">
      <button
        type="button"
        className="profile-back"
        onClick={() => navigate("/lobby")}
      >
        Voltar pro lobby
      </button>

      <div className="profile-hero">
        <div
          className="profile-hero-banner"
          style={
            bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : undefined
          }
          onClick={() => bannerSrc && setPreviewImage(bannerSrc)}
        />
        <div className="profile-hero-gradient" />

        <div className="profile-hero-inner">
          <div className="profile-hero-topline">
            <span>Perfil Commander</span>
            <button
              type="button"
              className="profile-settings-link"
              onClick={() => setSettingsOpen(true)}
            >
              Configuracoes
            </button>
          </div>

          <div className="profile-hero-main">
            <div className="profile-hero-avatarWrap">
              <div
                className="profile-hero-avatar"
                onClick={() => avatarSrc && setPreviewImage(avatarSrc)}
                style={{ cursor: avatarSrc ? "zoom-in" : "default" }}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="profile-hero-text">
              <h1>{displayName}</h1>
              <p className="profile-hero-sub">
                {customTitle || fullName || "Sem titulo personalizado"}
              </p>
              <p className="profile-hero-bio">
                {bio ||
                  "Monte sua identidade de comandante e deixe seu perfil pronto para a mesa."}
              </p>
            </div>

            <div className="profile-hero-actions">
              <div className="profile-hero-meta">
                <strong>{normalizedWins}</strong>
                <span>vitorias</span>
              </div>
              <div className="profile-hero-meta">
                <strong>{featuredDeck ? featuredDeck.name : "--"}</strong>
                <span>deck principal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="profile-showcase">
        <div className="profile-showcase__media">
          <div className="profile-showcase__heading">
            <span>Destaque visual</span>
            <h2>Foto personalizada</h2>
          </div>

          <button
            type="button"
            className="profile-showcase__imageFrame"
            onClick={() => showcaseSrc && setPreviewImage(showcaseSrc)}
          >
            {showcaseSrc ? (
              <img src={showcaseSrc} alt={`Destaque de ${displayName}`} />
            ) : (
              <div className="profile-showcase__placeholder">
                Adicione uma imagem personalizada nas configuracoes
              </div>
            )}
          </button>
        </div>

        <div className="profile-showcase__side">
          <article className="profile-panel profile-panel--compact">
            <span className="profile-panel__eyebrow">Resumo</span>
            <div className="profile-panel__stats">
              <div>
                <strong>{normalizedWins}</strong>
                <span>contagem de vitorias</span>
              </div>
              <div>
                <strong>{customTitle || "Sem titulo"}</strong>
                <span>titulo personalizado</span>
              </div>
            </div>
          </article>

          <article className="profile-panel profile-panel--deck">
            <span className="profile-panel__eyebrow">Deck principal</span>
            {decksLoading ? (
              <div className="profile-panel__empty">Carregando decks...</div>
            ) : featuredDeck ? (
              <div className="profile-deckCard">
                <strong>{featuredDeck.name}</strong>
                <span>
                  Comandante: {featuredDeck.commander || "Nao definido"}
                </span>
                <span>{(featuredDeck.cards || []).length} tipos de carta</span>
              </div>
            ) : (
              <div className="profile-panel__empty">
                Escolha um deck principal nas configuracoes.
              </div>
            )}
          </article>
        </div>
      </section>

      {settingsOpen && (
        <div className="profile-settingsModal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="profile-settingsModal__backdrop"
            onClick={() => setSettingsOpen(false)}
            aria-label="Fechar configuracoes"
          />

          <section className="profile-settings">
            <div className="profile-settings-header">
              <div>
                <span>Configuracoes</span>
                <h2>Ajustes da conta</h2>
                <p>
                  Altere seus dados do perfil, destaque visual, titulo, vitorias
                  e deck principal.
                </p>
              </div>
              <button
                type="button"
                className="profile-settings-close"
                onClick={() => setSettingsOpen(false)}
              >
                Fechar
              </button>
            </div>

            <div className="profile-layout">
              <form onSubmit={handleSaveProfile} className="form-card profile-settingsCard">
                <div className="profile-form-heading">
                  <span>Perfil publico</span>
                  <h2>Dados do comandante</h2>
                  <p>
                    Organize sua identidade, selecione a midia principal e
                    deixe o perfil mais consistente com o que aparece na tela.
                  </p>
                </div>

                <div className="profile-settingsSection">
                  <div className="profile-sectionHeader">
                    <div>
                      <span>Identidade</span>
                      <h3>Informacoes principais</h3>
                    </div>
                    <p>Campos que aparecem com mais frequencia no perfil.</p>
                  </div>

                  <div className="profile-fieldsGrid">
                    <label className="profile-field">
                      <span>Apelido (nome no jogo)</span>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Ex: zYumoto"
                      />
                    </label>

                    <label className="profile-field">
                      <span>Nome completo</span>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Opcional"
                      />
                    </label>

                    <label className="profile-field">
                      <span>Titulo personalizado</span>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) =>
                          setCustomTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))
                        }
                        placeholder="Ex: Campeao do Plano"
                        maxLength={TITLE_MAX_LENGTH}
                      />
                    </label>

                    <label className="profile-field">
                      <span>Quantidade de vitorias</span>
                      <input
                        type="number"
                        min="0"
                        max={WINS_MAX}
                        value={victoryCount}
                        onChange={(e) => setVictoryCount(e.target.value)}
                        placeholder="0"
                      />
                    </label>
                  </div>
                </div>

                <div className="profile-settingsSection">
                  <div className="profile-sectionHeader">
                    <div>
                      <span>Midia</span>
                      <h3>Imagens do perfil</h3>
                    </div>
                    <p>
                      Corte e ajuste cada imagem antes de salvar para manter o
                      visual sincronizado.
                    </p>
                  </div>

                  <div className="profile-mediaGrid">
                    {settingsPreviewMedia.map((item) => (
                      <article key={item.key} className="profile-mediaCard">
                        <div
                          className={`profile-mediaCard__preview profile-mediaCard__preview--${item.key}`}
                        >
                          {item.image ? (
                            <img src={item.image} alt={item.title} />
                          ) : (
                            <div className="profile-mediaCard__placeholder">
                              {item.title}
                            </div>
                          )}
                        </div>

                        <div className="profile-mediaCard__body">
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.description}</p>
                          </div>

                          <div className="profile-uploadRow">
                            <label className="profile-uploadButton">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handlePickImage(item.key, e.target.files?.[0])
                                }
                              />
                              {item.image ? "Trocar imagem" : "Escolher imagem"}
                            </label>
                            {item.image && (
                              <button
                                type="button"
                                className="profile-clearButton"
                                onClick={item.onRemove}
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="profile-settingsSection">
                  <div className="profile-sectionHeader">
                    <div>
                      <span>Apresentacao</span>
                      <h3>Resumo do perfil</h3>
                    </div>
                    <p>
                      Escolha o deck em destaque e adicione uma descricao curta.
                    </p>
                  </div>

                  <label className="profile-field">
                    <span>Deck principal</span>
                    <select
                      value={featuredDeckId}
                      onChange={(e) => setFeaturedDeckId(e.target.value)}
                    >
                      <option value="">Nenhum deck selecionado</option>
                      {decks.map((deck) => (
                        <option key={deck._id} value={deck._id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>Sobre voce</span>
                    <textarea
                      value={bio}
                      onChange={(e) =>
                        setBio(e.target.value.slice(0, BIO_MAX_LENGTH))
                      }
                      placeholder="Algumas informacoes rapidas sobre voce"
                      rows={3}
                      maxLength={BIO_MAX_LENGTH}
                    />
                    <span className="profile-char-count">
                      {bio.length}/{BIO_MAX_LENGTH}
                    </span>
                  </label>
                </div>

                <div className="profile-formFooter">
                  {profileMessage && (
                    <p className="feedback-text">{profileMessage}</p>
                  )}

                  <button type="submit" disabled={savingProfile}>
                    {savingProfile ? "Salvando..." : "Salvar perfil"}
                  </button>
                </div>
              </form>

              <div className="profile-settingsAside">
                <article className="form-card profile-settingsSnapshot">
                  <div className="profile-form-heading">
                    <span>Preview</span>
                    <h2>Como seu perfil aparece</h2>
                    <p>
                      Uma leitura rapida do que vai ficar em destaque depois de
                      salvar.
                    </p>
                  </div>

                  <div className="profile-settingsSnapshot__hero">
                    <div
                      className="profile-settingsSnapshot__banner"
                      style={
                        bannerSrc
                          ? { backgroundImage: `url(${bannerSrc})` }
                          : undefined
                      }
                    />
                    <div className="profile-settingsSnapshot__avatar">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={displayName} />
                      ) : (
                        <span>{displayName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  <div className="profile-settingsSnapshot__body">
                    <strong>{displayName}</strong>
                    <span>{customTitle || "Sem titulo personalizado"}</span>
                    <p>
                      {bio ||
                        "Seu resumo ainda esta vazio. Use esse espaco para definir sua presenca na mesa."}
                    </p>
                  </div>

                  <div className="profile-settingsSnapshot__meta">
                    <div>
                      <strong>{normalizedWins}</strong>
                      <span>vitorias</span>
                    </div>
                    <div>
                      <strong>{featuredDeck ? featuredDeck.name : "--"}</strong>
                      <span>deck principal</span>
                    </div>
                  </div>
                </article>

                <form onSubmit={handleChangePassword} className="form-card profile-settingsCard">
                <div className="profile-form-heading">
                  <span>Seguranca</span>
                  <h2>Trocar senha</h2>
                  <p>
                    Atualize a senha sem sair do perfil. Use algo facil de
                    lembrar e dificil de adivinhar.
                  </p>
                </div>

                  <label className="profile-field">
                    <span>Senha atual</span>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Nova senha</span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </label>

                  <div className="profile-formFooter">
                    {passwordMessage && (
                      <p className="feedback-text">{passwordMessage}</p>
                    )}

                    <button type="submit" disabled={changingPassword}>
                      {changingPassword ? "Trocando..." : "Atualizar senha"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      )}

      {previewImage && (
        <ImageModal url={previewImage} onClose={() => setPreviewImage(null)} />
      )}

      <ImageCropModal
        open={cropperOpen}
        source={cropperSource}
        variant={cropperTarget}
        onClose={() => {
          setCropperOpen(false);
          setCropperSource("");
        }}
        onApply={applyCroppedImage}
      />
    </section>
  );
}

export default Profile;

