// 로그인 페이지 로직
(function () {
  // 이미 로그인되어 있으면 대시보드로
  if (Auth.getToken()) {
    location.replace("points.html");
    return;
  }

  // 에러 메시지 표시
  var params = new URLSearchParams(location.search);
  var error = params.get("error");
  if (error) {
    var box = document.getElementById("error");
    var messages = {
      not_admin: "어드민 권한이 없는 계정입니다.",
      kakao: "카카오 로그인이 취소되었거나 실패했습니다.",
      no_code: "인증 코드를 받지 못했습니다.",
      server: "로그인 처리 중 오류가 발생했습니다.",
    };
    box.textContent = messages[error] || "로그인에 실패했습니다.";
    box.style.display = "block";
  }

  document.getElementById("kakao-login").addEventListener("click", function () {
    Kakao.authorize();
  });
})();
