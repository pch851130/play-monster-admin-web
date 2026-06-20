// 대시보드: admin 검증 후 본인 정보 표시
(function () {
  function text(v) {
    return v === null || v === undefined || v === "" ? "-" : String(v);
  }

  function row(label, value) {
    return "<tr><th>" + label + "</th><td>" + text(value) + "</td></tr>";
  }

  // HTML 인젝션 방지용 escape
  function esc(v) {
    return text(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function run() {
    var user = await Auth.requireAdmin();
    if (!user) {
      return; // requireAdmin 이 리다이렉트 처리
    }

    document.getElementById("loading").style.display = "none";
    document.getElementById("content").style.display = "block";

    document.getElementById("admin-name").textContent = user.name || user.referralCode || "관리자";

    initPointSum();
    initPayouts();
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

  // 출금(PAYOUT) 목록 조회 + 성공/실패 처리
  function initPayouts() {
    var form = document.getElementById("payout-form");
    var statusSelect = document.getElementById("po-status");
    var message = document.getElementById("po-message");
    var table = document.getElementById("po-table");
    var body = document.getElementById("po-body");

    function showMessage(msg) {
      table.style.display = "none";
      message.textContent = msg;
      message.style.display = "block";
    }

    function num(v) {
      return typeof v === "number" ? v.toLocaleString() : text(v);
    }

    function actionCell(item) {
      // PENDING 상태만 성공/실패 처리 가능
      if (item.payoutStatus !== "PENDING") {
        return "-";
      }
      var uuid = esc(item.uuid);
      return (
        '<button type="button" class="btn-mini btn-ok" data-action="complete" data-uuid="' +
        uuid +
        '">성공</button> ' +
        '<button type="button" class="btn-mini btn-no" data-action="fail" data-uuid="' +
        uuid +
        '">실패</button>'
      );
    }

    function render(list) {
      body.innerHTML = list
        .map(function (item) {
          return (
            "<tr>" +
            "<td>" + esc(item.date) + "</td>" +
            "<td>" + num(item.point) + "</td>" +
            "<td>" + esc(item.payoutStatus) + "</td>" +
            "<td>" + esc(item.name) + "</td>" +
            "<td>" + esc(item.bankName) + "</td>" +
            "<td>" + esc(item.accountNumber) + "</td>" +
            "<td>" + esc(item.birthDate) + "</td>" +
            "<td>" + esc(item.payoutFailedReason) + "</td>" +
            "<td>" + actionCell(item) + "</td>" +
            "</tr>"
          );
        })
        .join("");
      message.style.display = "none";
      table.style.display = "table";
    }

    async function load() {
      showMessage("불러오는 중...");
      var list = await Api.fetchPayouts(Auth.getToken(), statusSelect.value);
      if (!list) {
        showMessage("조회에 실패했습니다.");
        return;
      }
      if (list.length === 0) {
        showMessage("데이터가 없습니다.");
        return;
      }
      render(list);
    }

    async function handleAction(action, uuid) {
      var result;
      if (action === "complete") {
        if (!window.confirm("이 출금을 성공(완료) 처리할까요?")) {
          return;
        }
        result = await Api.completePayout(Auth.getToken(), uuid);
      } else {
        var reason = window.prompt("실패 사유를 입력하세요.");
        if (reason === null || reason.trim() === "") {
          return; // 취소하거나 빈 사유면 중단
        }
        result = await Api.failPayout(Auth.getToken(), uuid, reason.trim());
      }

      if (result !== true) {
        window.alert("처리 실패: " + result);
        return;
      }
      load(); // 변경 후 현재 상태로 재조회
    }

    // 이벤트 위임: 성공/실패 버튼 클릭 처리
    body.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-action]");
      if (!btn) {
        return;
      }
      handleAction(btn.getAttribute("data-action"), btn.getAttribute("data-uuid"));
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      load();
    });

    load(); // 최초 진입 시 기본값(PENDING)으로 자동 조회
  }

  document.getElementById("logout").addEventListener("click", function () {
    Auth.logout();
  });

  run();
})();
