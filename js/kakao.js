// 카카오 OAuth (REST, 브라우저 전용)
window.Kakao = (function () {
  var AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
  var TOKEN_URL = "https://kauth.kakao.com/oauth/token";
  var LOGOUT_URL = "https://kapi.kakao.com/v1/user/logout";

  // 카카오 로그인(동의) 페이지로 이동
  function authorize() {
    var params = new URLSearchParams({
      client_id: CONFIG.KAKAO_REST_API_KEY,
      redirect_uri: CONFIG.REDIRECT_URI,
      response_type: "code",
    });
    window.location.href = AUTHORIZE_URL + "?" + params.toString();
  }

  // authorization code -> access token 교환
  async function exchangeToken(code) {
    var params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CONFIG.KAKAO_REST_API_KEY,
      redirect_uri: CONFIG.REDIRECT_URI,
      code: code,
    });
    var res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: params.toString(),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok || !data.access_token) {
      throw new Error("카카오 토큰 교환 실패: " + (data.error_description || res.status));
    }
    return data.access_token;
  }

  // 카카오 로그아웃(토큰 만료). 실패해도 무시.
  async function logout(accessToken) {
    try {
      await fetch(LOGOUT_URL, {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken },
      });
    } catch (e) {
      /* ignore */
    }
  }

  return { authorize: authorize, exchangeToken: exchangeToken, logout: logout };
})();
