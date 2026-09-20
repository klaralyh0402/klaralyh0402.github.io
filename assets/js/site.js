(() => {
  "use strict";

  const root = document.documentElement;
  const storageKey = "lyh-homepage-language";
  const content = window.HOMEPAGE_CONTENT || null;
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isHomePage = currentPage === "" || currentPage === "index.html";
  const langToggle = document.querySelector("[data-language-toggle]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-site-nav]");
  const header = document.querySelector("[data-site-header]");

  const getLanguage = () => (root.dataset.language === "en" ? "en" : "zh");
  const readLanguage = () => {
    try {
      return window.localStorage.getItem(storageKey) === "en" ? "en" : "zh";
    } catch (error) {
      return "zh";
    }
  };
  const saveLanguage = (language) => {
    try {
      window.localStorage.setItem(storageKey, language);
    } catch (error) {}
  };

  const pair = (zh = "", en = "") => ({ zh: zh || "", en: en || "" });
  const localizedValue = (value, language) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[language] || value.zh || value.en || "";
  };
  const setPair = (node, value) => {
    if (!node || !value) return;
    if (typeof value === "string") {
      node.dataset.zh = value;
      node.dataset.en = value;
    } else {
      node.dataset.zh = value.zh || "";
      node.dataset.en = value.en || "";
    }
    node.textContent = localizedValue(value, getLanguage());
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  };
  const pairElement = (tag, className, value) => {
    const node = element(tag, className);
    setPair(node, value);
    return node;
  };
  const appendTags = (container, tagsZh, tagsEn, fallbackZh = [], fallbackEn = []) => {
    const zhTags = Array.isArray(tagsZh) && tagsZh.length ? tagsZh : fallbackZh;
    const enTags = Array.isArray(tagsEn) && tagsEn.length ? tagsEn : fallbackEn;
    zhTags.forEach((tag, index) => container.append(pairElement("span", "pill", pair(tag, enTags[index] || tag))));
  };
  const renderEmpty = (container, zh, en) => {
    container.replaceChildren(pairElement("p", "empty-state", pair(zh, en)));
  };

  const applyLanguage = (language, persist = true) => {
    const isEnglish = language === "en";
    root.lang = isEnglish ? "en" : "zh-CN";
    root.dataset.language = language;
    document.querySelectorAll("[data-zh][data-en]").forEach((node) => {
      node.textContent = isEnglish ? node.dataset.en : node.dataset.zh;
    });
    document.querySelectorAll("[data-alt-zh][data-alt-en]").forEach((node) => {
      node.alt = isEnglish ? node.dataset.altEn : node.dataset.altZh;
    });
    document.querySelectorAll("[data-aria-zh][data-aria-en]").forEach((node) => {
      node.setAttribute("aria-label", isEnglish ? node.dataset.ariaEn : node.dataset.ariaZh);
    });
    if (root.dataset.titleZh && root.dataset.titleEn) document.title = isEnglish ? root.dataset.titleEn : root.dataset.titleZh;
    if (langToggle) langToggle.setAttribute("aria-pressed", String(isEnglish));
    if (persist) saveLanguage(language);
  };

  const renderBasicContent = () => {
    if (!content?.basic) return;
    const basic = content.basic;
    document.querySelectorAll('[data-content="name"]').forEach((node) => setPair(node, basic.name));
    document.querySelectorAll('[data-content="hero-name"]').forEach((node) => setPair(node, basic.name));
    document.querySelectorAll('[data-content="intro"]').forEach((node) => setPair(node, basic.intro));
    document.querySelectorAll("[data-content-photo]").forEach((node) => {
      node.src = localizedValue(basic.photo, "zh") || "assets/images/profile.jpg";
      node.dataset.altZh = basic.name?.zh ? `${basic.name.zh}的照片` : "个人照片";
      node.dataset.altEn = basic.name?.en ? `A photo of ${basic.name.en}` : "Personal photo";
      node.alt = localizedValue(pair(node.dataset.altZh, node.dataset.altEn), getLanguage());
    });
    if (isHomePage && basic.title) {
      root.dataset.titleZh = basic.title.zh || root.dataset.titleZh;
      root.dataset.titleEn = basic.title.en || root.dataset.titleEn;
    }
    const description = document.querySelector('meta[name="description"]');
    if (isHomePage && description && basic.description) description.content = localizedValue(basic.description, getLanguage());

    const firstEducation = content.education?.[0];
    const firstCertificate = content.certificates?.[0];
    const hobbyNames = pair(
      (content.hobbies || []).map((item) => localizedValue(item.name, "zh")).filter(Boolean).join(" · "),
      (content.hobbies || []).map((item) => localizedValue(item.name, "en")).filter(Boolean).join(" · ")
    );
    document.querySelectorAll('[data-fact="education-school"]').forEach((node) => setPair(node, firstEducation?.school));
    document.querySelectorAll('[data-fact="education-details"]').forEach((node) => setPair(node, firstEducation?.details));
    document.querySelectorAll('[data-fact="certificate"]').forEach((node) => {
      const cert = firstCertificate;
      setPair(node, pair(
        cert ? [cert.name?.zh, cert.level].filter(Boolean).join(" · ") : "",
        cert ? [cert.name?.en, cert.level].filter(Boolean).join(" · ") : ""
      ));
    });
    document.querySelectorAll('[data-fact="certificate-note"]').forEach((node) => setPair(node, firstCertificate?.name || pair("能力证书", "Certificate")));
    document.querySelectorAll('[data-fact="hobbies"]').forEach((node) => setPair(node, hobbyNames));

    const contactContainer = document.querySelector("[data-contact-links]");
    if (contactContainer) {
      const links = [];
      const email = localizedValue(basic.email, "zh");
      const github = localizedValue(basic.github, "zh");
      if (email) links.push({ href: email.startsWith("mailto:") ? email : `mailto:${email}`, label: pair("邮箱", "Email") });
      if (github) links.push({ href: github, label: pair("GitHub", "GitHub") });
      contactContainer.replaceChildren();
      links.forEach((item) => {
        const link = pairElement("a", "button button-secondary", item.label);
        link.href = item.href;
        contactContainer.append(link);
      });
    }
  };

  const renderEducation = () => {
    const container = document.querySelector('[data-render="education"]');
    if (!container || !content) return;
    const records = content.education || [];
    if (!records.length) return renderEmpty(container, "教育经历正在更新中。", "Education information is being updated.");
    container.replaceChildren();
    records.forEach((record) => {
      const item = element("article", "timeline-item reveal");
      const card = element("div", "timeline-card");
      card.append(pairElement("p", "eyebrow", pair("教育经历", "Education")));
      card.append(pairElement("h2", "", record.school));
      card.append(pairElement("p", "", record.details));
      const tags = element("div", "hero-meta");
      appendTags(tags, record.tags?.zh, record.tags?.en);
      if (tags.childElementCount) card.append(tags);
      item.append(element("div", "timeline-date", `${record.start || ""} — ${record.end || ""}`), card);
      container.append(item);
    });
  };

  const renderAwards = () => {
    const container = document.querySelector('[data-render="awards"]');
    if (!container || !content) return;
    const records = content.awards || [];
    if (!records.length) return renderEmpty(container, "获奖经历正在更新中。", "Award information is being updated.");
    container.replaceChildren();
    records.forEach((record) => {
      const article = element("article", "award-feature reveal");
      const yearPanel = element("div", "award-year-panel");
      yearPanel.append(element("span", "award-year", record.year || ""));
      yearPanel.append(pairElement("small", "", record.region));
      const copy = element("div", "award-copy");
      copy.append(pairElement("p", "eyebrow", record.prize));
      copy.append(pairElement("h2", "", record.title));
      copy.append(pairElement("p", "lead", record.description));
      const tags = element("div", "award-tags");
      if (record.year) tags.append(pairElement("span", "tag", pair(record.year, record.year)));
      [record.title, record.prize, record.region].filter(Boolean).forEach((value) => tags.append(pairElement("span", "tag", value)));
      copy.append(tags);
      article.append(yearPanel, copy);
      container.append(article);
    });
  };

  const renderCertificates = () => {
    const container = document.querySelector('[data-render="certificates"]');
    if (!container || !content) return;
    const records = content.certificates || [];
    if (!records.length) return renderEmpty(container, "能力证书正在更新中。", "Certificate information is being updated.");
    container.replaceChildren();
    records.forEach((record) => {
      const article = element("article", "certificate-card reveal");
      const visual = element("div", "certificate-visual");
      visual.setAttribute("aria-hidden", "true");
      const emblem = element("div", "certificate-emblem");
      const emblemInner = element("div", "emblem-inner");
      emblemInner.append(pairElement("span", "emblem-small", record.name));
      emblemInner.append(element("span", "emblem-level", record.level || "—"));
      emblemInner.append(element("span", "emblem-code", record.program || ""));
      emblem.append(emblemInner);
      visual.append(emblem);

      const copy = element("div", "certificate-copy");
      copy.append(pairElement("p", "eyebrow", record.status));
      copy.append(pairElement("h2", "", pair(
        [record.name?.zh, record.level].filter(Boolean).join(" · "),
        [record.name?.en, record.level].filter(Boolean).join(" · ")
      )));
      copy.append(pairElement("p", "lead", record.description));
      const details = element("div", "certificate-details");
      [
        [pair("证书名称", "Certificate"), record.name],
        [pair("证书等级", "Level"), pair(record.level, record.level)],
        [pair("考试项目", "Diploma"), pair(record.program, record.program)],
        [pair("状态", "Status"), record.status],
      ].forEach(([label, value]) => {
        const item = element("div", "detail-item");
        item.append(pairElement("small", "", label));
        item.append(pairElement("strong", "", value));
        details.append(item);
      });
      copy.append(details);
      article.append(visual, copy);
      container.append(article);
    });
  };

  const hobbyIcons = {
    music: '<path d="M9 18V5l10-2v13"/><path d="M9 18a3 3 0 1 1-3-3h3v3Zm10-2a3 3 0 1 1-3-3h3v3Z"/>',
    swimming: '<path d="M3 16c2.2 0 2.2 2 4.4 2s2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.4-2"/><path d="M3 20c2.2 0 2.2 2 4.4 2s2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.4-2"/><circle cx="16.5" cy="6.5" r="2.5"/><path d="M8 14.5 6.8 9.8a2 2 0 0 1 2.6-2.4l3 1.1 2.1-.9"/>',
    fitness: '<path d="M6 10v4M10 7v10M14 7v10M18 10v4"/><path d="M3 12h2m14 0h2M10 4v3m4-3v3M10 17v3m4-3v3"/>',
    book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23.5v-18Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5a3.5 3.5 0 0 1 3.5 3.5v-18Z"/>',
    camera: '<path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z"/><circle cx="12" cy="13" r="4"/>',
    travel: '<path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
    language: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  };
  const hobbyTints = ["#e8cfa8", "#bcd7dd", "#c5d6c8", "#d8cbe1", "#e3c0b4"];

  const renderHobbies = () => {
    const container = document.querySelector('[data-render="hobbies"]');
    if (!container || !content) return;
    const records = content.hobbies || [];
    if (!records.length) return renderEmpty(container, "爱好内容正在更新中。", "Interest information is being updated.");
    container.replaceChildren();
    records.forEach((record, index) => {
      const article = element("article", "hobby-card reveal");
      article.style.setProperty("--card-tint", hobbyTints[index % hobbyTints.length]);
      const icon = element("div", "hobby-icon");
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = `<svg viewBox="0 0 24 24">${hobbyIcons[record.icon] || hobbyIcons.music}</svg>`;
      const copy = element("div", "hobby-card-copy");
      copy.append(element("span", "hobby-number", String(index + 1).padStart(2, "0") + " / " + (record.name?.en || "").toUpperCase()));
      copy.append(pairElement("h2", "", record.name));
      copy.append(pairElement("p", "", record.description));
      article.append(icon, copy);
      container.append(article);
    });
  };

  const renderContent = () => {
    renderBasicContent();
    renderEducation();
    renderAwards();
    renderCertificates();
    renderHobbies();
  };

  if (langToggle) {
    langToggle.addEventListener("click", () => {
      applyLanguage(getLanguage() === "zh" ? "en" : "zh");
      if (isHomePage && content?.basic?.description) {
        const description = document.querySelector('meta[name="description"]');
        if (description) description.content = localizedValue(content.basic.description, getLanguage());
      }
    });
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }));
    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
        nav.classList.remove("is-open");
        navToggle.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        nav.classList.remove("is-open");
        navToggle.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  const syncHeader = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  renderContent();
  applyLanguage(readLanguage(), false);

  const revealElements = document.querySelectorAll(".reveal");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealElements.forEach((node) => node.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          activeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px" });
    revealElements.forEach((node) => observer.observe(node));
  }
})();