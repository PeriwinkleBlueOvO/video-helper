(() => {
  const LABEL_CLASS = "avh-label";
  const HIGHLIGHT_CLASS = "avh-highlight";
  const NEXT_CLASS = "avh-next-highlight";
  const PANEL_CLASS = "avh-panel";
  const PROGRESS_OVERLAY_CLASS = "avh-progress-overlay";

  const STORAGE_KEYS = {
    allowedHost: "avhAllowedHost",
    allowedOrigin: "avhAllowedOrigin",
    autoRunning: "avhAutoRunning",
    waitLimitSeconds: "avhWaitLimitSeconds",
    scanIntervalSeconds: "avhScanIntervalSeconds",
    visitedActivityIds: "avhVisitedActivityIds"
  };

  const DEFAULT_ALLOWED_HOSTS = ["localhost", "127.0.0.1"];

  let config = {
    allowedHost: "",
    allowedOrigin: "",
    waitLimitSeconds: 180,
    scanIntervalSeconds: 15
  };

  let lastScan = { videos: [], playButtons: [], nextButtons: [] };

  let autoState = {
    running: false,
    scanTimer: null,
    startedAt: 0,
    status: "Idle",
    detail: "Auto test is not running.",
    visitedActivityIds: new Set()
  };

  let panelState = {
    visible: false,
    minimized: false
  };

  async function initConfig() {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.allowedHost,
      STORAGE_KEYS.allowedOrigin,
      STORAGE_KEYS.autoRunning,
      STORAGE_KEYS.waitLimitSeconds,
      STORAGE_KEYS.scanIntervalSeconds,
      STORAGE_KEYS.visitedActivityIds
    ]);

    config.allowedHost = data[STORAGE_KEYS.allowedHost] || "";
    config.allowedOrigin = data[STORAGE_KEYS.allowedOrigin] || "";
    config.waitLimitSeconds = sanitizeInt(data[STORAGE_KEYS.waitLimitSeconds], 180, 10, 3600);
    config.scanIntervalSeconds = sanitizeInt(data[STORAGE_KEYS.scanIntervalSeconds], 15, 3, 600);
    if (config.scanIntervalSeconds > config.waitLimitSeconds) config.scanIntervalSeconds = config.waitLimitSeconds;

    autoState.running = Boolean(data[STORAGE_KEYS.autoRunning]);
    autoState.visitedActivityIds = new Set(Array.isArray(data[STORAGE_KEYS.visitedActivityIds]) ? data[STORAGE_KEYS.visitedActivityIds] : []);

    const currentId = getCurrentActivityId();
    if (currentId) autoState.visitedActivityIds.add(currentId);

    if (autoState.running && isAllowedHost()) {
      panelState.visible = true;
      setAutoStatus("Restoring test", "The page was reloaded. Auto test will continue.");
      addPanelMessage("Auto test state restored. Continuing after page load.");
      setTimeout(() => startAutoTest(), 1000);
    } else {
      setAutoStatus("Idle", "Auto test is not running.");
      if (isAllowedHost()) {
        // Do not auto-open the panel. The extension popup can open it.
      }
    }
  }

  function sanitizeInt(value, fallback, min, max) {
    const n = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  async function setAllowedSite(host, origin) {
    config.allowedHost = host || "";
    config.allowedOrigin = origin || "";

    await chrome.storage.local.set({
      [STORAGE_KEYS.allowedHost]: config.allowedHost,
      [STORAGE_KEYS.allowedOrigin]: config.allowedOrigin
    });

    addPanelMessage(`Test URL updated: ${config.allowedOrigin || config.allowedHost || "not set"}`);
    return getAutoStatus();
  }

  async function setTimingSettings(waitLimitSeconds, scanIntervalSeconds) {
    config.waitLimitSeconds = sanitizeInt(waitLimitSeconds, 180, 10, 3600);
    config.scanIntervalSeconds = sanitizeInt(scanIntervalSeconds, 15, 3, 600);
    if (config.scanIntervalSeconds > config.waitLimitSeconds) {
      config.scanIntervalSeconds = config.waitLimitSeconds;
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.waitLimitSeconds]: config.waitLimitSeconds,
      [STORAGE_KEYS.scanIntervalSeconds]: config.scanIntervalSeconds
    });

    setAutoStatus(
      autoState.running ? "Timing settings updated" : "Idle",
      `Wait limit: ${config.waitLimitSeconds}s | Scan interval: ${config.scanIntervalSeconds}s`
    );

    addPanelMessage(`Timing settings updated. Wait limit: ${config.waitLimitSeconds}s, scan interval: ${config.scanIntervalSeconds}s.`);

    return getAutoStatus();
  }

  function getAllowedHostLabel() {
    if (config.allowedHost) return config.allowedHost;
    return DEFAULT_ALLOWED_HOSTS.join(", ");
  }

  function isAllowedHost() {
    if (DEFAULT_ALLOWED_HOSTS.includes(location.hostname)) return true;
    if (!config.allowedHost) return false;
    return location.hostname === config.allowedHost;
  }

  function getAutoStatus() {
    return {
      ok: true,
      running: autoState.running,
      status: autoState.status,
      detail: autoState.detail,
      host: location.hostname,
      href: location.href,
      allowed: isAllowedHost(),
      allowedHost: getAllowedHostLabel(),
      allowedOrigin: config.allowedOrigin || "",
      currentActivityId: getCurrentActivityId(),
      settings: {
        waitLimitSeconds: config.waitLimitSeconds,
        scanIntervalSeconds: config.scanIntervalSeconds
      }
    };
  }

  function setAutoStatus(status, detail = "") {
    autoState.status = status || "Working";
    autoState.detail = detail || "";
    updateProgressOverlay();

    const panel = document.querySelector("." + PANEL_CLASS);
    if (panel && autoState.running) {
      const statusEl = panel.querySelector(".avh-inline-progress-status");
      const detailEl = panel.querySelector(".avh-inline-progress-substatus");
      if (statusEl) statusEl.textContent = autoState.status || "Running";
      if (detailEl) detailEl.textContent = autoState.detail || "Working.";
    }
  }

  function ensureProgressOverlay() { return null; }

  function updateProgressOverlay() {
    // In 2.2.0, progress is shown inside the page control panel instead of a centered overlay.
  }

  function hideProgressOverlay() {
    // No centered overlay in 2.2.0.
  }

  function clearAll() {
    document.querySelectorAll("." + HIGHLIGHT_CLASS + ", ." + NEXT_CLASS).forEach(el => {
      el.classList.remove(HIGHLIGHT_CLASS);
      el.classList.remove(NEXT_CLASS);
    });
    document.querySelectorAll("." + LABEL_CLASS).forEach(el => el.remove());
  }

  function clearNextHighlightOnly() {
    document.querySelectorAll("." + NEXT_CLASS).forEach(el => el.classList.remove(NEXT_CLASS));
    document.querySelectorAll(".avh-next-label").forEach(el => el.remove());
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 8 &&
      rect.height > 8 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) !== 0;
  }

  function isInsideVideoHelperUi(el) {
    if (!el || !el.closest) return false;
    return Boolean(el.closest(
      ".avh-panel, .avh-mini-chip, .avh-label, .avh-progress-overlay, .avh-inline-progress"
    ));
  }

  function queryPageCandidates(selector) {
    return Array.from(document.querySelectorAll(selector)).filter(el => !isInsideVideoHelperUi(el));
  }

  function textOf(el) {
    return [
      el.innerText,
      el.textContent,
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("alt"),
      el.getAttribute("class"),
      el.getAttribute("id"),
      el.getAttribute("href"),
      el.getAttribute("data-activity-id"),
      el.getAttribute("data-id"),
      el.getAttribute("onclick"),
      el.getAttribute("ng-click")
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function looksLikePlayButton(el) {
    const tag = el.tagName.toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();
    const text = textOf(el);
    const visibleText = ((el.innerText || el.textContent || "") + "").trim().toLowerCase();

    const candidateTag =
      tag === "button" || tag === "a" || role === "button" || el.onclick || el.hasAttribute("tabindex");

    if (!candidateTag || !isVisible(el)) return false;

    const negativeKeywords = [
      "开始答题", "答题", "测验", "考试", "作业", "练习", "随堂测验",
      "课后练习", "章节测验", "单元测试", "问卷", "调查", "投票",
      "quiz", "exam", "test", "homework", "exercise", "question",
      "assignment", "survey", "vote", "submit", "提交", "发布", "保存",
      "取消", "确定", "评论", "讨论", "疑问", "笔记", "获取当前时间"
    ];

    if (negativeKeywords.some(k => text.includes(k) || visibleText.includes(k))) {
      return false;
    }

    const keywords = [
      "play", "播放", "继续播放", "video", "btn-play", "vjs-play",
      "plyr", "player", "start video", "resume video"
    ];

    const hasKeyword = keywords.some(k => text.includes(k));
    const hasPlayIcon =
      text.includes("▶") ||
      text.includes("▷") ||
      text.includes("►") ||
      text.includes("⏵") ||
      text.includes("play_arrow");

    return (hasKeyword || hasPlayIcon) && isVisible(el);
  }

  function looksLikeNextButton(el) {
    const tag = el.tagName.toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();
    const rawText = textOf(el);
    const visibleText = ((el.innerText || el.textContent || "") + "").trim().toLowerCase();

    const candidateTag =
      tag === "button" || tag === "a" || role === "button" || el.onclick || el.hasAttribute("tabindex");

    if (!candidateTag || !isVisible(el)) return false;

    const negativeKeywords = [
      "开始答题", "答题", "测验", "考试", "作业", "练习", "quiz", "exam",
      "test", "homework", "exercise", "question", "submit", "发布", "保存",
      "取消", "确定", "评论", "讨论", "疑问", "笔记", "全屏", "播放",
      "隐藏", "切换", "获取当前时间"
    ];

    if (negativeKeywords.some(k => rawText.includes(k) || visibleText.includes(k))) {
      return false;
    }

    const strongNextTexts = [
      "下一个", "下一节", "下一章", "下节", "后一个",
      "next", "next lesson", "next activity", "next resource"
    ];

    const exactText = visibleText.replace(/\s+/g, " ");
    const exactAllowed = ["下一个", "下一节", "下一章", "下节", "next"];

    if (exactAllowed.includes(exactText)) return true;

    return strongNextTexts.some(k => rawText.includes(k));
  }

  function addLabel(target, text, isNext = false) {
    const rect = target.getBoundingClientRect();
    const label = document.createElement("div");
    label.className = LABEL_CLASS + (isNext ? " avh-next-label" : "");
    label.textContent = text;
    label.style.left = `${Math.max(8, rect.left + window.scrollX)}px`;
    label.style.top = `${Math.max(8, rect.top + window.scrollY - 28)}px`;
    document.body.appendChild(label);
  }

  function showMiniChip() {
    let chip = document.querySelector(".avh-mini-chip");
    if (!chip) {
      chip = document.createElement("button");
      chip.className = "avh-mini-chip";
      chip.textContent = "Video Helper";
      chip.addEventListener("click", () => {
        panelState.visible = true;
        panelState.minimized = false;
        chip.remove();
        addPanelMessage("Video Helper restored.");
      });
      document.body.appendChild(chip);
    }
  }

  function hideMiniChip() {
    const chip = document.querySelector(".avh-mini-chip");
    if (chip) chip.remove();
  }

  function minimizePanel() {
    const panel = document.querySelector("." + PANEL_CLASS);
    if (panel) panel.remove();
    panelState.visible = false;
    panelState.minimized = true;
    showMiniChip();
  }

  function showPanel(message = "Video Helper opened.") {
    if (!isAllowedHost()) {
      return {
        ok: false,
        message: `Current host ${location.hostname} is not allowed. Open Configuration and save this site first.`
      };
    }

    panelState.visible = true;
    panelState.minimized = false;
    hideMiniChip();
    addPanelMessage(message);
    return { ok: true, message: "Panel opened.", status: getAutoStatus() };
  }

  function addPanelMessage(message) {
    if (!isAllowedHost()) return;

    panelState.visible = true;
    panelState.minimized = false;
    hideMiniChip();

    let panel = document.querySelector("." + PANEL_CLASS);

    if (!panel) {
      panel = document.createElement("div");
      panel.className = PANEL_CLASS;
      document.body.appendChild(panel);
    }

    const running = autoState.running;
    const stopClass = running ? "danger" : "secondary";
    const stopDisabled = running ? "" : "disabled";
    const runDotClass = running ? "avh-dot running" : "avh-dot";
    const statusText = running ? `Running | ${location.hostname}` : `Idle | ${location.hostname}`;

    panel.innerHTML = `
      <div class="avh-panel-header">
        <div class="avh-panel-title">
          <h2>Video Helper <span class="avh-beta-pill">2.3.3</span></h2>
        </div>
        <button id="avh-min-btn" class="avh-min-btn" title="Minimize">–</button>
      </div>

      <div class="avh-running-row">
        <span class="${runDotClass}"></span>
        <span>${escapeHtml(statusText)}</span>
      </div>

      ${running ? `
        <div class="avh-inline-progress">
          <div class="avh-inline-progress-title">In Progress</div>
          <div class="avh-inline-progress-status">${escapeHtml(autoState.status || "Running")}</div>
          <div class="avh-inline-progress-substatus">${escapeHtml(autoState.detail || "Working.")}</div>
        </div>
      ` : ""}

      <p>${escapeHtml(message)}</p>
      <p>Wait limit: ${config.waitLimitSeconds}s | Scan interval: ${config.scanIntervalSeconds}s</p>

      <button id="avh-scan-btn">Scan Page</button>
      <button id="avh-play-btn">Play Current Video</button>
      <button id="avh-manual-next-btn" class="orange">Next</button>
      <button id="avh-next-btn" class="secondary">Highlight Next</button>
      <button id="avh-auto-btn">Start</button>
      <button id="avh-stop-btn" class="${stopClass}" ${stopDisabled}>Stop</button>
      <button id="avh-clear-btn" class="secondary">Clear Highlights</button>
    `;

    document.getElementById("avh-min-btn").addEventListener("click", minimizePanel);
    document.getElementById("avh-scan-btn").addEventListener("click", scan);
    document.getElementById("avh-play-btn").addEventListener("click", playCurrentVideo);
    document.getElementById("avh-manual-next-btn").addEventListener("click", () => goNextResource({ manual: true }));
    document.getElementById("avh-next-btn").addEventListener("click", highlightNextButtons);
    document.getElementById("avh-auto-btn").addEventListener("click", startAutoTest);
    document.getElementById("avh-stop-btn").addEventListener("click", stopAutoTest);
    document.getElementById("avh-clear-btn").addEventListener("click", clearAll);

    updateProgressOverlay();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function scan() {
    clearAll();

    const videos = queryPageCandidates("video").filter(isVisible);
    const clickableSelector = "button, a, [role='button'], [tabindex], div, span";

    const playButtons = queryPageCandidates(clickableSelector)
      .filter(looksLikePlayButton)
      .slice(0, 30);

    const nextButtons = queryPageCandidates(clickableSelector)
      .filter(looksLikeNextButton)
      .slice(0, 10);

    lastScan = { videos, playButtons, nextButtons };

    videos.forEach((video, i) => {
      video.classList.add(HIGHLIGHT_CLASS);
      addLabel(video, `Video ${i + 1}`);
      bindVideoEnded(video);
    });

    playButtons.forEach((btn, i) => {
      btn.classList.add(HIGHLIGHT_CLASS);
      addLabel(btn, `Play? ${i + 1}`);
    });

    nextButtons.forEach((btn, i) => {
      btn.classList.add(NEXT_CLASS);
      addLabel(btn, `Next? ${i + 1}`, true);
    });

    if (autoState.running) {
      setAutoStatus("Scanning page", `Videos: ${videos.length} | Play buttons: ${playButtons.length} | Next buttons: ${nextButtons.length}`);
    }

    addPanelMessage(`Scan complete. Videos: ${videos.length}, play buttons: ${playButtons.length}, next buttons: ${nextButtons.length}.`);

    return {
      ok: true,
      videoCount: videos.length,
      buttonCount: playButtons.length,
      nextCount: nextButtons.length,
      host: location.hostname,
      allowed: isAllowedHost(),
      allowedHost: getAllowedHostLabel(),
      running: autoState.running,
      status: autoState.status,
      detail: autoState.detail
    };
  }

  function bindVideoEnded(video) {
    if (!video || video.dataset.avhEndedBound === "1") return;
    video.dataset.avhEndedBound = "1";

    video.addEventListener("ended", () => {
      if (autoState.running) {
        setAutoStatus("Video ended", "Opening the next resource.");
        addPanelMessage("Video ended. Auto test will go next.");
        setTimeout(() => goNextResource({ manual: false }), 1000);
      } else {
        highlightNextButtons();
      }
    });
  }

  function highlightNextButtons() {
    clearNextHighlightOnly();

    const nextButtons = queryPageCandidates("button, a, [role='button'], [tabindex], div, span")
      .filter(looksLikeNextButton)
      .slice(0, 10);

    lastScan.nextButtons = nextButtons;

    nextButtons.forEach((btn, i) => {
      btn.classList.add(NEXT_CLASS);
      addLabel(btn, `Next? ${i + 1}`, true);
    });

    if (nextButtons.length > 0) {
      if (autoState.running) setAutoStatus("Next button found", `${nextButtons.length} possible next button(s) detected.`);
      addPanelMessage(`${nextButtons.length} possible next button(s) highlighted.`);
      nextButtons[0].scrollIntoView({ behavior: "smooth", block: "center" });
      return { ok: true, message: `${nextButtons.length} possible next button(s) highlighted.`, running: autoState.running };
    }

    if (autoState.running) setAutoStatus("No next button found", "Trying path-based next resolver.");
    addPanelMessage("No obvious next button found.");
    return { ok: false, message: "No obvious next button found.", running: autoState.running };
  }

  async function playCurrentVideo() {
    const videos = queryPageCandidates("video").filter(isVisible);

    if (videos.length > 0) {
      const video = videos[0];

      try {
        video.muted = true;
        bindVideoEnded(video);
        await video.play();

        if (autoState.running) setAutoStatus("Playing video", "Waiting for the video to finish.");
        addPanelMessage("Current video playback started.");
        return { ok: true, message: "Current video playback started.", running: autoState.running };
      } catch (err) {
        if (autoState.running) setAutoStatus("Direct play blocked", "Trying to use a visible play control.");
        addPanelMessage("Direct playback was blocked. Trying a possible play button.");

        const playButtons = queryPageCandidates("button, a, [role='button'], [tabindex], div, span")
          .filter(looksLikePlayButton);

        if (playButtons.length > 0) {
          playButtons[0].click();
          return { ok: true, message: "Clicked a possible play button.", running: autoState.running };
        }

        return { ok: false, message: "Playback blocked and no play button found.", running: autoState.running };
      }
    }

    const playButtons = queryPageCandidates("button, a, [role='button'], [tabindex], div, span")
      .filter(looksLikePlayButton);

    if (playButtons.length > 0) {
      playButtons[0].click();
      if (autoState.running) setAutoStatus("Clicked play control", "Waiting for playback to start.");
      addPanelMessage("No direct video tag found. Clicked a possible play button.");
      return { ok: true, message: "Clicked a possible play button.", running: autoState.running };
    }

    if (autoState.running) setAutoStatus("No video found", "Waiting or moving to the next resource.");
    addPanelMessage("No video or play button found.");
    return { ok: false, message: "No video or play button found.", running: autoState.running };
  }

  function getCurrentCourseId() {
    const m = location.pathname.match(/\/course\/(\d+)/);
    return m ? m[1] : "";
  }

  function getCurrentActivityId() {
    const hashMatch = location.hash.match(/#\/(\d{3,})/);
    if (hashMatch) return hashMatch[1];

    const pathMatch = location.href.match(/learning-activity[^#]*#\/(\d{3,})/);
    if (pathMatch) return pathMatch[1];

    return "";
  }

  function extractActivityIdFromText(text) {
    if (!text) return "";
    const patterns = [
      /learning-activity[^#"' <>()]*#\/(\d{3,})/i,
      /#\/(\d{3,})/,
      /activity[_-]?id["'=:\s]+(\d{3,})/i,
      /activities\/(\d{3,})/i
    ];
    for (const p of patterns) {
      const m = String(text).match(p);
      if (m) return m[1];
    }
    return "";
  }

  function extractActivityIdFromElement(el) {
    if (!el) return "";

    const attrNames = [
      "href",
      "data-activity-id",
      "data-id",
      "data-url",
      "data-href",
      "to",
      "onclick",
      "ng-click",
      "aria-label",
      "title"
    ];

    for (const name of attrNames) {
      const value = el.getAttribute && el.getAttribute(name);
      const id = extractActivityIdFromText(value);
      if (id) return id;
    }

    const ds = el.dataset || {};
    for (const key of Object.keys(ds)) {
      const id = extractActivityIdFromText(ds[key]);
      if (id) return id;
    }

    return "";
  }

  function collectActivityListFromDom() {
    const candidates = queryPageCandidates("a[href], [data-activity-id], [data-id], [data-url], [data-href], [onclick], [ng-click], li, div, span, button");
    const seen = new Set();
    const items = [];

    for (const el of candidates) {
      const id = extractActivityIdFromElement(el);
      if (!id || seen.has(id)) continue;

      seen.add(id);

      let href = "";
      if (el.getAttribute) {
        href = el.getAttribute("href") || el.getAttribute("data-url") || el.getAttribute("data-href") || "";
      }

      const title = ((el.innerText || el.textContent || el.getAttribute?.("title") || el.getAttribute?.("aria-label") || "") + "").trim().replace(/\s+/g, " ").slice(0, 120);

      items.push({ id, title, href, element: el });
    }

    return items;
  }

  function makeActivityUrl(activityId) {
    const courseId = getCurrentCourseId();
    const basePath = courseId ? `/course/${courseId}/learning-activity/full-screen` : location.pathname;
    return `${location.origin}${basePath}#/${activityId}`;
  }

  function resolveNextActivity() {
    const currentId = getCurrentActivityId();
    const list = collectActivityListFromDom();

    if (!currentId) {
      return { ok: false, reason: "current_activity_id_not_found", listCount: list.length };
    }

    const index = list.findIndex(item => item.id === currentId);

    if (index === -1) {
      return { ok: false, reason: "current_activity_not_found_in_dom", currentId, listCount: list.length, listPreview: list.slice(0, 8).map(x => ({ id: x.id, title: x.title })) };
    }

    for (let i = index + 1; i < list.length; i++) {
      const item = list[i];
      if (!item || !item.id) continue;
      if (autoState.visitedActivityIds.has(item.id)) continue;

      return {
        ok: true,
        source: "course_catalog_dom",
        currentId,
        currentIndex: index,
        nextIndex: i,
        next: item,
        listCount: list.length
      };
    }

    return { ok: false, reason: "no_unvisited_next_activity", currentId, index, listCount: list.length };
  }

  async function rememberVisitedActivity(id) {
    if (!id) return;
    autoState.visitedActivityIds.add(String(id));
    await chrome.storage.local.set({ [STORAGE_KEYS.visitedActivityIds]: Array.from(autoState.visitedActivityIds) });
  }

  async function openActivity(item, source = "unknown") {
    if (!item || !item.id) {
      return { ok: false, message: "No activity item to open." };
    }

    await rememberVisitedActivity(item.id);

    setAutoStatus("Opening next resource", `Next activity: ${item.id} | Source: ${source}`);
    addPanelMessage(`Opening next resource. Activity: ${item.id}. Source: ${source}.`);

    const el = item.element;
    if (el && typeof el.click === "function" && isVisible(el)) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => el.click(), 250);
      return { ok: true, method: "click", id: item.id, title: item.title || "", source };
    }

    const url = item.href && item.href !== "javascript:;" ? new URL(item.href, location.href).href : makeActivityUrl(item.id);
    setTimeout(() => {
      location.assign(url);
    }, 250);

    return { ok: true, method: "location.assign", id: item.id, url, title: item.title || "", source };
  }

  function tryClickNativeNextButton() {
    const nextButtons = queryPageCandidates("button, a, [role='button'], [tabindex], div, span")
      .filter(looksLikeNextButton);

    lastScan.nextButtons = nextButtons;

    if (nextButtons.length === 0) {
      return { ok: false, message: "No native next button found." };
    }

    const btn = nextButtons[0];
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => btn.click(), 300);

    setAutoStatus("Opening next page", "Used the native next button.");
    addPanelMessage("Used the native next button. Waiting for the next resource to load.");
    return { ok: true, method: "native_next_button", count: nextButtons.length };
  }

  async function goNextResource({ manual = false } = {}) {
    if (manual && !isAllowedHost()) {
      const msg = `Current host ${location.hostname} is not allowed. Save the test URL in the extension popup.`;
      addPanelMessage(msg);
      return { ok: false, message: msg };
    }

    const currentId = getCurrentActivityId();
    if (currentId) await rememberVisitedActivity(currentId);

    if (autoState.running) {
      setAutoStatus(manual ? "Manual next requested" : "Resolving next resource", "Trying the native next button first.");
    }

    const nativeResult = tryClickNativeNextButton();

    if (nativeResult.ok) {
      if (autoState.running) startWaitingForVideoAfterNext();
      return { ok: true, used: nativeResult };
    }

    setAutoStatus("Resolving next resource", "No native next button found. Searching the course path.");
    const resolved = resolveNextActivity();

    if (!resolved.ok) {
      const msg = `No next resource resolved. Reason: ${resolved.reason || "unknown"}.`;
      setAutoStatus("No further resource found", msg);
      addPanelMessage(msg);
      if (autoState.running) await stopAutoTest();
      return { ok: false, message: msg, resolver: resolved };
    }

    const openResult = await openActivity(resolved.next, resolved.source);

    if (autoState.running) {
      startWaitingForVideoAfterNext();
    }

    return { ok: true, used: "path_resolver", resolver: sanitizeResolverForResponse(resolved), openResult };
  }

  function sanitizeResolverForResponse(resolved) {
    if (!resolved) return resolved;
    return {
      ok: resolved.ok,
      source: resolved.source,
      currentId: resolved.currentId,
      currentIndex: resolved.currentIndex,
      nextIndex: resolved.nextIndex,
      listCount: resolved.listCount,
      next: resolved.next ? {
        id: resolved.next.id,
        title: resolved.next.title,
        href: resolved.next.href
      } : null,
      reason: resolved.reason
    };
  }

  function clickNextAndWaitForVideo() {
    goNextResource({ manual: false });
  }

  function startWaitingForVideoAfterNext() {
    clearAutoTimers();

    autoState.startedAt = Date.now();

    setAutoStatus("Waiting for video", `Scanning every ${config.scanIntervalSeconds}s for up to ${config.waitLimitSeconds}s.`);
    addPanelMessage(`Waiting for video. Scanning every ${config.scanIntervalSeconds}s for up to ${config.waitLimitSeconds}s.`);

    autoState.scanTimer = setInterval(async () => {
      if (!autoState.running) {
        clearAutoTimers();
        return;
      }

      const elapsed = Date.now() - autoState.startedAt;
      const limitMs = config.waitLimitSeconds * 1000;

      if (elapsed >= limitMs) {
        clearAutoTimers();
        setAutoStatus("No video after timeout", "Moving to the next resource.");
        addPanelMessage("No video found within the wait limit. Moving to the next resource.");
        goNextResource({ manual: false });
        return;
      }

      const result = scan();

      if (result.videoCount > 0 || result.buttonCount > 0) {
        clearAutoTimers();
        setAutoStatus("Video found", "Starting playback.");
        addPanelMessage("Video or play button found. Starting playback.");
        await playCurrentVideo();
      } else {
        const leftSeconds = Math.ceil((limitMs - elapsed) / 1000);
        setAutoStatus("Waiting for video", `${leftSeconds} seconds remaining.`);
        addPanelMessage(`No video found yet. About ${leftSeconds} seconds remaining.`);
      }
    }, config.scanIntervalSeconds * 1000);
  }

  async function startAutoTest() {
    if (!isAllowedHost()) {
      const msg = `Current host ${location.hostname} is not allowed. Save the test URL in the extension popup. Allowed: ${getAllowedHostLabel()}`;
      setAutoStatus("Host not allowed", "Save the correct test URL before starting.");
      addPanelMessage(msg);
      return { ok: false, message: msg, running: autoState.running, allowed: false };
    }

    if (autoState.running) {
      setAutoStatus("Running auto test", autoState.detail || "Auto test is already active.");
      addPanelMessage("Auto test is already running.");
      return { ok: true, message: "Auto test is already running.", running: true, allowed: true };
    }

    autoState.running = true;
    await chrome.storage.local.set({ [STORAGE_KEYS.autoRunning]: true });

    const currentId = getCurrentActivityId();
    if (currentId) await rememberVisitedActivity(currentId);

    setAutoStatus("Starting auto test", "Scanning the current page.");
    addPanelMessage("Auto test started. Scanning and trying to play the current page video.");

    const result = scan();

    if (result.videoCount > 0 || result.buttonCount > 0) {
      await playCurrentVideo();
    } else {
      setAutoStatus("No video on current page", "Opening the next resource.");
      addPanelMessage("No video on current page. Auto test will try next.");
      goNextResource({ manual: false });
    }

    return { ok: true, message: "Auto test started.", running: true, allowed: true };
  }

  function clearAutoTimers() {
    if (autoState.scanTimer) {
      clearInterval(autoState.scanTimer);
      autoState.scanTimer = null;
    }
  }

  async function stopAutoTest() {
    autoState.running = false;
    clearAutoTimers();
    await chrome.storage.local.set({ [STORAGE_KEYS.autoRunning]: false });
    setAutoStatus("Idle", "Auto test is not running.");
    hideProgressOverlay();
    addPanelMessage("Auto test stopped.");
    return { ok: true, message: "Auto test stopped.", running: false };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SHOW_VIDEO_HELPER_PANEL") {
      sendResponse(showPanel("Video Helper opened from extension menu."));
      return true;
    }

    if (message.type === "GET_AUTO_STATUS") {
      sendResponse(getAutoStatus());
      return true;
    }

    if (message.type === "SET_ALLOWED_SITE") {
      setAllowedSite(message.host, message.origin).then(sendResponse);
      return true;
    }

    if (message.type === "SET_TIMING_SETTINGS") {
      setTimingSettings(message.waitLimitSeconds, message.scanIntervalSeconds).then(sendResponse);
      return true;
    }

    if (message.type === "SCAN_VIDEO_CONTROLS") {
      sendResponse(scan());
      return true;
    }

    if (message.type === "PLAY_CURRENT_VIDEO") {
      playCurrentVideo().then(sendResponse);
      return true;
    }

    if (message.type === "HIGHLIGHT_NEXT") {
      sendResponse(highlightNextButtons());
      return true;
    }

    if (message.type === "GO_NEXT_RESOURCE") {
      goNextResource({ manual: Boolean(message.manual) }).then(sendResponse);
      return true;
    }

    if (message.type === "START_AUTO_TEST") {
      startAutoTest().then(sendResponse);
      return true;
    }

    if (message.type === "STOP_AUTO_TEST") {
      stopAutoTest().then(sendResponse);
      return true;
    }

    if (message.type === "CLEAR_VIDEO_HELPER") {
      clearAll();
      sendResponse({ ok: true, running: autoState.running });
      return true;
    }
  });

  initConfig();
})();
