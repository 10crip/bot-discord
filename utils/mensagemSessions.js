const sessions = new Map();

function createSession(userId, data = {}) {
  const session = {
    userId,
    guildId: null,
    channelId: null,
    dmChannelId: null,
    template: null,
    titulo: null,
    subtitulo: null,
    texto: null,
    cor: "#5865F2",
    banner: null,
    thumbnail: null,
    footer: "Sistema de Mensagens 2.1",
    usarImagem: false,
    createdAt: Date.now(),
    ...data
  };

  sessions.set(userId, session);
  return session;
}

function getSession(userId) {
  return sessions.get(userId) || null;
}

function updateSession(userId, data = {}) {
  const current = sessions.get(userId);
  if (!current) return null;

  const updated = {
    ...current,
    ...data,
    updatedAt: Date.now()
  };

  sessions.set(userId, updated);
  return updated;
}

function deleteSession(userId) {
  return sessions.delete(userId);
}

function resetSessionToTemplate(userId, templateDefaults) {
  const current = sessions.get(userId);
  if (!current) return null;

  const updated = {
    ...current,
    ...templateDefaults,
    updatedAt: Date.now()
  };

  sessions.set(userId, updated);
  return updated;
}

function cleanupExpiredSessions(maxAgeMs = 1000 * 60 * 30) {
  const now = Date.now();

  for (const [userId, session] of sessions.entries()) {
    if (!session.createdAt) continue;
    if (now - session.createdAt > maxAgeMs) {
      sessions.delete(userId);
    }
  }
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  resetSessionToTemplate,
  cleanupExpiredSessions
};