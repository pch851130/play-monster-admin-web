// 전역 설정
window.CONFIG = {
  // 카카오 REST API 키
  KAKAO_REST_API_KEY: "4c77fac3a86792b117b51ac3737a2721",

  // play-monster-server API 베이스 URL
  API_BASE_URL: "https://api.play-monster.com",

  // 카카오 콘솔에 등록할 Redirect URI (현재 위치 기준 oauth.html 로 자동 계산)
  // 카카오 디벨로퍼스 > 카카오 로그인 > Redirect URI 에 아래 값을 그대로 등록해야 한다.
  get REDIRECT_URI() {
    return new URL("oauth.html", window.location.href).href;
  },

  // 로그인 토큰을 저장할 localStorage 키
  TOKEN_KEY: "pm_admin_token",
};
