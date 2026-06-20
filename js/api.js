// play-monster-server API 클라이언트
// 서버 응답 형식: { responseCode: "OK"|..., errorMessage, responseData }
// 주의: 에러도 HTTP 200 으로 오므로 responseCode 로 성공 여부를 판단한다.
window.Api = (function () {
  // 카카오 access token 으로 본인(GET /users) 조회. 실패/비로그인 시 null.
  async function fetchMe(accessToken) {
    var res;
    try {
      res = await fetch(CONFIG.API_BASE_URL + "/users", {
        method: "GET",
        headers: { accessToken: accessToken },
      });
    } catch (e) {
      return null; // 네트워크 오류
    }

    var body = await res.json().catch(function () {
      return null;
    });
    if (!body || body.responseCode !== "OK" || !body.responseData) {
      return null;
    }
    return body.responseData; // User
  }

  // admin = true 인 사용자만 어드민으로 인정
  function isAdmin(user) {
    return !!user && user.admin === true;
  }

  return { fetchMe: fetchMe, isAdmin: isAdmin };
})();
