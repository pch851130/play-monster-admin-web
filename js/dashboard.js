// 대시보드: admin 검증 후 본인 정보 표시
(function () {
  function text(v) {
    return v === null || v === undefined || v === "" ? "-" : String(v);
  }

  function row(label, value) {
    return "<tr><th>" + label + "</th><td>" + text(value) + "</td></tr>";
  }

  async function run() {
    var user = await Auth.requireAdmin();
    if (!user) {
      return; // requireAdmin 이 리다이렉트 처리
    }

    document.getElementById("loading").style.display = "none";
    document.getElementById("content").style.display = "block";

    document.getElementById("admin-name").textContent = user.name || user.referralCode || "관리자";

    var rows = [
      row("UUID", user.uuid),
      row("이름", user.name),
      row("포인트", typeof user.point === "number" ? user.point.toLocaleString() : user.point),
      row("누적 출금 포인트", typeof user.payoutPoint === "number" ? user.payoutPoint.toLocaleString() : user.payoutPoint),
      row("친구 수", user.friendUserCount),
      row("추천 코드", user.referralCode),
      row("휴대폰", user.phoneNumber),
      row("은행", user.bankName),
      row("계좌번호", user.accountNumber),
      row("생년월일", user.birthDate),
      row("어드민", user.admin === true ? "예" : "아니오"),
      row("가입일", user.createdAt),
    ];
    document.getElementById("user-table").innerHTML = rows.join("");
  }

  document.getElementById("logout").addEventListener("click", function () {
    Auth.logout();
  });

  run();
})();
