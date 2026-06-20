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

    initPointSum();
  }

  // 일자별 포인트 합계 조회 폼 동작
  function initPointSum() {
    var form = document.getElementById("point-sum-form");
    var message = document.getElementById("ps-message");
    var table = document.getElementById("ps-table");
    var body = document.getElementById("ps-body");

    function showMessage(msg) {
      table.style.display = "none";
      message.textContent = msg;
      message.style.display = "block";
    }

    async function load() {
      var day = parseInt(document.getElementById("ps-day").value, 10);
      var type = document.getElementById("ps-type").value;
      if (!day || day < 1) {
        showMessage("기간(일)은 1 이상이어야 합니다.");
        return;
      }

      showMessage("불러오는 중...");

      var sumMap = await Api.fetchDailyPointSum(Auth.getToken(), day, type);
      if (!sumMap) {
        showMessage("조회에 실패했습니다.");
        return;
      }

      // 서버 맵을 날짜 오름차순으로 정렬해 표시
      var dates = Object.keys(sumMap).sort();
      if (dates.length === 0) {
        showMessage("데이터가 없습니다.");
        return;
      }

      var total = 0;
      var html = dates
        .map(function (date) {
          var point = sumMap[date];
          total += point;
          return row(date, point.toLocaleString());
        })
        .join("");
      html += "<tr><th>합계</th><td>" + total.toLocaleString() + "</td></tr>";
      body.innerHTML = html;

      message.style.display = "none";
      table.style.display = "table";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      load();
    });

    load(); // 최초 진입 시 기본값(7일, OFFERWALL)으로 자동 조회
  }

  document.getElementById("logout").addEventListener("click", function () {
    Auth.logout();
  });

  run();
})();
