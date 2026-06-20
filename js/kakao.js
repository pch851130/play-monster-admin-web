// 카카오 OAuth (REST, 브라우저 전용)
window.Kakao = (function () {
  var AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
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

  // authorization code -> access token 교환.
  // client_secret 이 켜져 있어 브라우저에서 직접 교환하지 않고,
  // play-monster-server(/auth/kakao/token)가 시크릿을 붙여 대신 교환한다.
  async function exchangeToken(code) {
    var res = await fetch(CONFIG.API_BASE_URL + "/auth/kakao/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code, redirectUri: CONFIG.REDIRECT_URI }),
    });
    var body = await res.json().catch(function () {
      return null;
    });
    if (!body || body.responseCode !== "OK" || !body.responseData || !body.responseData.accessToken) {
      throw new Error("카카오 토큰 교환 실패: " + (body && body.errorMessage ? body.errorMessage : res.status));
    }
    return body.responseData.accessToken;
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
