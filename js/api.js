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

  // 최근 day 일간 type 별 일자별 포인트 합계 조회.
  // GET /admin/point-history/daily-sum?day=7&type=OFFERWALL
  // 성공 시 { "yyyy-MM-dd": 합계, ... } 맵 반환, 실패 시 null.
  async function fetchDailyPointSum(accessToken, day, type) {
    var url =
      CONFIG.API_BASE_URL +
      "/admin/point-history/daily-sum?day=" +
      encodeURIComponent(day) +
      "&type=" +
      encodeURIComponent(type);
    var res;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: { accessToken: accessToken },
      });
    } catch (e) {
      return null; // 네트워크 오류
    }

    var body = await res.json().catch(function () {
      return null;
    });
    if (!body || body.responseCode !== "OK") {
      return null;
    }
    return body.responseData || {}; // Map<날짜, 합계>
  }

  // status(PENDING/FAILED/COMPLETED) 별 PAYOUT 포인트 히스토리 목록 조회.
  // GET /admin/payouts?status=PENDING
  // 성공 시 PointHistory 배열 반환, 실패 시 null.
  async function fetchPayouts(accessToken, status) {
    var url =
      CONFIG.API_BASE_URL +
      "/admin/payouts?status=" +
      encodeURIComponent(status);
    var res;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: { accessToken: accessToken },
      });
    } catch (e) {
      return null; // 네트워크 오류
    }

    var body = await res.json().catch(function () {
      return null;
    });
    if (!body || body.responseCode !== "OK") {
      return null;
    }
    return body.responseData || []; // List<PointHistory>
  }

  // 출금 상태를 변경하는 공통 호출. 성공 시 true, 실패 시 errorMessage(문자열) 반환.
  async function putPayout(url, accessToken) {
    var res;
    try {
      res = await fetch(url, {
        method: "PUT",
        headers: { accessToken: accessToken },
      });
    } catch (e) {
      return "네트워크 오류가 발생했습니다.";
    }

    var body = await res.json().catch(function () {
      return null;
    });
    if (!body) {
      return "응답을 해석할 수 없습니다.";
    }
    if (body.responseCode !== "OK") {
      return body.errorMessage || "처리에 실패했습니다.";
    }
    return true;
  }

  // PENDING 출금을 완료(COMPLETED) 처리. PUT /admin/payouts/{uuid}/complete
  async function completePayout(accessToken, uuid) {
    return putPayout(
      CONFIG.API_BASE_URL + "/admin/payouts/" + encodeURIComponent(uuid) + "/complete",
      accessToken
    );
  }

  // PENDING 출금을 실패(FAILED) 처리. PUT /admin/payouts/{uuid}/fail?reason=...
  async function failPayout(accessToken, uuid, reason) {
    return putPayout(
      CONFIG.API_BASE_URL +
        "/admin/payouts/" +
        encodeURIComponent(uuid) +
        "/fail?reason=" +
        encodeURIComponent(reason),
      accessToken
    );
  }

  // 사용자 목록(최신 가입순) 페이지 조회. GET /admin/users?page=0&size=20
  // 성공 시 Spring Page 객체(content/totalPages/number 등) 반환, 실패 시 null.
  async function fetchUsers(accessToken, page, size) {
    var url =
      CONFIG.API_BASE_URL +
      "/admin/users?page=" +
      encodeURIComponent(page) +
      "&size=" +
      encodeURIComponent(size);
    var res;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: { accessToken: accessToken },
      });
    } catch (e) {
      return null; // 네트워크 오류
    }

    var body = await res.json().catch(function () {
      return null;
    });
    if (!body || body.responseCode !== "OK") {
      return null;
    }
    return body.responseData || null; // Page<User>
  }

  // uuid 로 단일 사용자 조회. GET /admin/users/{uuid}
  // 성공 시 User 반환, 실패 시 null.
  async function fetchUser(accessToken, uuid) {
    var res;
    try {
      res = await fetch(
        CONFIG.API_BASE_URL + "/admin/users/" + encodeURIComponent(uuid),
        {
          method: "GET",
          headers: { accessToken: accessToken },
        }
      );
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

  return {
    fetchMe: fetchMe,
    isAdmin: isAdmin,
    fetchDailyPointSum: fetchDailyPointSum,
    fetchPayouts: fetchPayouts,
    completePayout: completePayout,
    failPayout: failPayout,
    fetchUsers: fetchUsers,
    fetchUser: fetchUser,
  };
})();
