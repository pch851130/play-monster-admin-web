// 카카오 콜백 처리: code -> token -> admin 검증
(function () {
  var statusEl = document.getElementById("status");

  function fail(error, token) {
    if (token) {
      Kakao.logout(token);
    }
    location.replace("login.html?error=" + error);
  }

  async function run() {
    var params = new URLSearchParams(location.search);

    if (params.get("error")) {
      fail("kakao");
      return;
    }
    var code = params.get("code");
    if (!code) {
      fail("no_code");
      return;
    }

    var token;
    try {
      statusEl.textContent = "카카오 인증 중...";
      token = await Kakao.exchangeToken(code);

      statusEl.textContent = "권한 확인 중...";
      var user = await Api.fetchMe(token);

      if (!Api.isAdmin(user)) {
        fail("not_admin", token);
        return;
      }

      Auth.setToken(token);
      location.replace("index.html");
    } catch (e) {
      console.error(e);
      fail("server", token);
    }
  }

  run();
})();
