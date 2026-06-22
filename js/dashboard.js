// 대시보드: admin 검증 후 본인 정보 표시
(function () {
  function text(v) {
    return v === null || v === undefined || v === "" ? "-" : String(v);
  }

  function row(label, value) {
    return "<tr><th>" + label + "</th><td>" + text(value) + "</td></tr>";
  }

  // 타임스탬프를 한국시간 기준 yyyy-MM-dd HH:mm:ss 로 표기
  var DATETIME_FMT = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  function fmtDateTime(v) {
    if (v === null || v === undefined || v === "") {
      return "-";
    }
    var d = new Date(v);
    if (isNaN(d.getTime())) {
      return text(v); // 파싱 실패 시 원본 표기
    }
    return DATETIME_FMT.format(d); // "yyyy-MM-dd HH:mm:ss"
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

    // 공용 사용자 상세 모달(출금/사용자 목록에서 공유)
    var showDetail = initUserDetail();

    // 각 패널의 로더를 등록(아직 조회하지 않음)
    var loaders = {
      "panel-points": initPointSum(),
      "panel-payouts": initPayouts(showDetail),
      "panel-users": initUsers(showDetail),
    };
    initMenu(loaders);
  }

  // 상단 메뉴(탭): 클릭한 메뉴의 패널만 표시 + 최초 진입 시에만 조회(지연 로딩)
  function initMenu(loaders) {
    var menu = document.getElementById("menu");
    var items = menu.querySelectorAll(".menu-item");
    var loaded = {}; // 이미 조회한 패널 기록

    function activate(target) {
      items.forEach(function (item) {
        var on = item.getAttribute("data-target") === target;
        item.classList.toggle("active", on);
        document.getElementById(item.getAttribute("data-target")).style.display = on ? "block" : "none";
      });

      // 해당 패널을 처음 여는 경우에만 데이터 조회
      if (!loaded[target] && loaders[target]) {
        loaded[target] = true;
        loaders[target]();
      }
    }

    menu.addEventListener("click", function (e) {
      var btn = e.target.closest(".menu-item");
      if (!btn) {
        return;
      }
      activate(btn.getAttribute("data-target"));
    });

    // 기본 활성 메뉴 조회
    var initial = menu.querySelector(".menu-item.active") || items[0];
    activate(initial.getAttribute("data-target"));
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

      // 포인트 합계와 사용자수를 함께 조회
      var token = Auth.getToken();
      var results = await Promise.all([
        Api.fetchDailyPointSum(token, day, type),
        Api.fetchDailyUserCount(token, day, type),
      ]);
      var sumMap = results[0];
      var countMap = results[1];
      if (!sumMap || !countMap) {
        showMessage("조회에 실패했습니다.");
        return;
      }

      // 서버 맵을 날짜 오름차순으로 정렬해 표시
      var dates = Object.keys(sumMap).sort();
      if (dates.length === 0) {
        showMessage("데이터가 없습니다.");
        return;
      }

      var totalPoint = 0;
      var totalCount = 0; // 사용자수 합(일자별 중복 포함)
      var html = dates
        .map(function (date) {
          var point = sumMap[date];
          var count = countMap[date] || 0;
          totalPoint += point;
          totalCount += count;
          return (
            "<tr><th>" + date + "</th>" +
            "<td>" + point.toLocaleString() + "</td>" +
            "<td>" + count.toLocaleString() + "</td></tr>"
          );
        })
        .join("");
      html +=
        "<tr><th>합계</th>" +
        "<td>" + totalPoint.toLocaleString() + "</td>" +
        "<td>" + totalCount.toLocaleString() + "</td></tr>";
      body.innerHTML = html;

      message.style.display = "none";
      table.style.display = "table";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      load();
    });

    return load; // 메뉴 진입 시 기본값(7일, OFFERWALL)으로 조회
  }

  // 출금(PAYOUT) 목록 조회 + 성공/실패 처리. showDetail: 공용 사용자 상세 모달
  function initPayouts(showDetail) {
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
            '<td><button type="button" class="btn-link" data-detail-uuid="' +
            esc(item.uuid) +
            '">' + esc(item.name) + "</button></td>" +
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

    // 이벤트 위임: 이름 클릭 → 공용 사용자 상세 모달(지급 후 목록 갱신)
    body.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-detail-uuid]");
      if (!btn) {
        return;
      }
      showDetail(btn.getAttribute("data-detail-uuid"), load);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      load();
    });

    return load; // 메뉴 진입 시 기본값(PENDING)으로 조회
  }

  // 사용자 목록(페이지네이션). showDetail: 공용 사용자 상세 모달 열기 함수
  function initUsers(showDetail) {
    var PAGE_SIZE = 20;
    var page = 0;
    var totalPages = 1;
    var search = ""; // 현재 검색어

    var searchForm = document.getElementById("user-search-form");
    var searchInput = document.getElementById("us-search");
    var message = document.getElementById("us-message");
    var table = document.getElementById("us-table");
    var body = document.getElementById("us-body");
    var pager = document.getElementById("us-pager");
    var pageInfo = document.getElementById("us-page-info");
    var prevBtn = document.getElementById("us-prev");
    var nextBtn = document.getElementById("us-next");

    function num(v) {
      return typeof v === "number" ? v.toLocaleString() : text(v);
    }

    function showMessage(msg) {
      table.style.display = "none";
      pager.style.display = "none";
      message.textContent = msg;
      message.style.display = "block";
    }

    function render(list) {
      body.innerHTML = list
        .map(function (u) {
          return (
            "<tr>" +
            "<td>" + esc(u.name) + "</td>" +
            "<td>" + num(u.point) + "</td>" +
            "<td>" + num(u.payoutPoint) + "</td>" +
            "<td>" + esc(u.phoneNumber) + "</td>" +
            "<td>" + esc(u.referralCode) + "</td>" +
            "<td>" + esc(fmtDateTime(u.createdAt)) + "</td>" +
            '<td><button type="button" class="btn-mini" data-uuid="' +
            esc(u.uuid) +
            '">상세</button></td>' +
            "</tr>"
          );
        })
        .join("");

      message.style.display = "none";
      table.style.display = "table";
      pager.style.display = "flex";
      pageInfo.textContent = page + 1 + " / " + totalPages;
      prevBtn.disabled = page <= 0;
      nextBtn.disabled = page >= totalPages - 1;
    }

    async function load() {
      showMessage("불러오는 중...");
      var pageData = await Api.fetchUsers(Auth.getToken(), page, PAGE_SIZE, search);
      if (!pageData) {
        showMessage("조회에 실패했습니다.");
        return;
      }
      totalPages = pageData.totalPages || 1;
      var list = pageData.content || [];
      if (list.length === 0) {
        showMessage("데이터가 없습니다.");
        return;
      }
      render(list);
    }

    // 이벤트 위임: 상세 버튼 클릭 → 공용 상세 모달(지급 후 목록 갱신)
    body.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-uuid]");
      if (!btn) {
        return;
      }
      showDetail(btn.getAttribute("data-uuid"), load);
    });

    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      search = searchInput.value.trim();
      page = 0; // 검색 시 첫 페이지부터
      load();
    });

    prevBtn.addEventListener("click", function () {
      if (page > 0) {
        page--;
        load();
      }
    });
    nextBtn.addEventListener("click", function () {
      if (page < totalPages - 1) {
        page++;
        load();
      }
    });

    return load; // 메뉴 진입 시 첫 페이지 조회
  }

  // 공용 사용자 상세 모달. show(uuid, onChange) 로 열기.
  // onChange: 보너스 지급 후 호출할 콜백(목록 갱신 등)
  function initUserDetail() {
    var modal = document.getElementById("user-modal");
    var modalBody = document.getElementById("user-detail-body");
    var modalClose = document.getElementById("user-modal-close");
    var bonusBtn = document.getElementById("user-bonus-btn");
    var currentUuid = null; // 현재 상세 모달에 표시 중인 사용자
    var onChange = null; // 지급 후 호출할 콜백

    function num(v) {
      return typeof v === "number" ? v.toLocaleString() : text(v);
    }

    async function render(uuid) {
      modalBody.innerHTML = row("UUID", uuid);
      var u = await Api.fetchUser(Auth.getToken(), uuid);
      if (!u) {
        modalBody.innerHTML = row("오류", "사용자 정보를 불러오지 못했습니다.");
        return;
      }
      modalBody.innerHTML = [
        row("UUID", u.uuid),
        row("이름", u.name),
        row("포인트", num(u.point)),
        row("누적 출금 포인트", num(u.payoutPoint)),
        row("친구 수", u.friendUserCount),
        row("추천 코드", u.referralCode),
        row("휴대폰", u.phoneNumber),
        row("은행", u.bankName),
        row("계좌번호", u.accountNumber),
        row("생년월일", u.birthDate),
        row("어드민", u.admin === true ? "예" : "아니오"),
        row("게스트", u.guest === true ? "예" : "아니오"),
        row("탈퇴", u.deleted === true ? "예" : "아니오"),
        row("가입일", fmtDateTime(u.createdAt)),
      ].join("");
    }

    function show(uuid, changeCb) {
      currentUuid = uuid;
      onChange = changeCb || null;
      modal.style.display = "flex";
      render(uuid);
    }

    function closeModal() {
      modal.style.display = "none";
      currentUuid = null;
      onChange = null;
    }

    async function giveBonus() {
      if (!currentUuid) {
        return;
      }
      if (!window.confirm("이 사용자에게 보너스 포인트를 지급할까요?")) {
        return;
      }
      bonusBtn.disabled = true;
      var result = await Api.giveBonus(Auth.getToken(), currentUuid);
      bonusBtn.disabled = false;
      if (result !== true) {
        window.alert("지급 실패: " + result);
        return;
      }
      window.alert("보너스 포인트를 지급했습니다.");
      render(currentUuid); // 상세 갱신(포인트 반영)
      if (onChange) {
        onChange(); // 호출한 목록 갱신
      }
    }

    modalClose.addEventListener("click", closeModal);
    bonusBtn.addEventListener("click", giveBonus);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal(); // 배경 클릭 시 닫기
      }
    });

    return show;
  }

  document.getElementById("logout").addEventListener("click", function () {
    Auth.logout();
  });

  run();
})();
