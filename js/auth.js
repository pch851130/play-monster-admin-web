// 세션(토큰) 관리 + 페이지 가드
window.Auth = (function () {
  function getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  }
  function setToken(token) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
  }
  function clearToken() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
  }

  // 보호된 페이지용: 토큰이 있고 admin 이면 user 반환, 아니면 login.html 로 이동
  async function requireAdmin() {
    var token = getToken();
    if (!token) {
      location.replace("login.html");
      return null;
    }
    var user = await Api.fetchMe(token);
    if (!Api.isAdmin(user)) {
      clearToken();
      location.replace("login.html?error=not_admin");
      return null;
    }
    return user;
  }

  async function logout() {
    var token = getToken();
    if (token) {
      await Kakao.logout(token);
    }
    clearToken();
    location.replace("login.html");
  }

  return {
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    requireAdmin: requireAdmin,
    logout: logout,
  };
})();
