// Дизайн «Atlas 2»: интерактивные части страницы конспекта.
// Чипы вопросов экзамена, панель «Выжимка», увеличение фото, кнопка «Содержание» (телефон),
// соседние занятия в конце конспекта. Подключается в quartz/components/Head.tsx, стили — custom.scss.
;(function () {
  "use strict"

  const ICON_ZOOM =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/></svg>'
  const ICON_CLOSE =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  const ICON_LIST =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/></svg>'

  // Проводник Quartz без сохранённой позиции делает scrollIntoView() активного пункта —
  // это прокручивает всю страницу вниз при открытии. Даём ему позицию 0, он её восстановит.
  try {
    if (sessionStorage.getItem("explorerScrollTop") === null) sessionStorage.setItem("explorerScrollTop", "0")
  } catch (e) {}

  const pageCache = new Map()
  let indexPromise = null

  const base = () => (document.body.dataset.basepath || "").replace(/\/$/, "")
  const slug = () => document.body.dataset.slug || ""
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "")
  const el = (tag, cls, html) => {
    const e = document.createElement(tag)
    if (cls) e.className = cls
    if (html != null) e.innerHTML = html
    return e
  }

  function fetchPage(url) {
    if (!pageCache.has(url)) {
      pageCache.set(
        url,
        fetch(url)
          .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
          .then((h) => new DOMParser().parseFromString(h, "text/html"))
          .catch(() => null),
      )
    }
    return pageCache.get(url)
  }

  function contentIndex() {
    if (!indexPromise) {
      indexPromise = fetch(base() + "/static/contentIndex.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    }
    return indexPromise
  }

  function sectionHeading(root, re) {
    return Array.from(root.querySelectorAll("h2")).find((h) => re.test(text(h)))
  }

  // --- 1. Чипы «Вопросы экзамена» под заголовком (из раздела 4 конспекта) ---
  async function examChips(article) {
    const header = document.querySelector(".center .page-header")
    const h = sectionHeading(article, /^4\.\s*Экзаменационные вопросы/)
    if (!header || !h || header.querySelector(".atlas-exam")) return
    let p = h.nextElementSibling
    while (p && p.tagName !== "P" && p.tagName !== "H2") p = p.nextElementSibling
    if (!p || p.tagName !== "P") return
    const link = p.querySelector("a[href]")
    const strong = Array.from(p.querySelectorAll("strong")).pop()
    if (!link || !strong) return
    const nums = text(strong)
      .split(/[,;]\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!nums.length) return
    const examUrl = new URL(link.getAttribute("href"), location.href)
    examUrl.hash = ""

    const box = el("div", "atlas-exam")
    box.appendChild(el("span", "", "Вопросы экзамена"))
    const chips = nums.map((n) => {
      const a = el("a", "atlas-chip")
      a.href = examUrl.href
      a.textContent = n
      box.appendChild(a)
      return a
    })
    const meta = header.querySelector(".content-meta")
    ;(meta || header.lastElementChild).insertAdjacentElement("afterend", box)

    const doc = await fetchPage(examUrl.href)
    if (!doc) return
    const map = new Map()
    let part = ""
    doc.querySelectorAll("article h2, article h3").forEach((hd) => {
      const t = text(hd)
      const roman = t.match(/^([IVX]+)\.\s/)
      if (hd.tagName === "H2") {
        part = roman ? roman[1] : ""
        return
      }
      const m = t.match(/^(\d+)\.\s*(.*)$/)
      if (!m || !hd.id) return
      const rec = { id: hd.id, title: m[2] }
      if (part) map.set(part + "." + m[1], rec)
      if (!map.has(m[1])) map.set(m[1], rec)
    })
    chips.forEach((a) => {
      const rec = map.get(a.textContent)
      if (!rec) return
      let short = rec.title
        .split(/[.:;(]/)[0]
        .trim()
        .replace(/^Топографическая анатомия\s+/, "Топография ")
        .replace(/^Оперативный доступ/, "Доступ")
        .replace(/^Оперативные доступы/, "Доступы")
      if (short.length > 44) short = short.slice(0, 42).replace(/\s+\S*$/, "") + "…"
      a.href = examUrl.href + "#" + rec.id
      a.title = rec.title
      a.textContent = a.textContent + ". " + short
    })
  }

  // --- 2. «Выжимка для переписывания» одной панелью ---
  function summaryPanel(article) {
    const h = sectionHeading(article, /^6\.\s*Выжимка/)
    if (!h || (h.nextElementSibling && h.nextElementSibling.classList.contains("atlas-summary"))) return
    const items = []
    let n = h.nextElementSibling
    while (n && n.tagName !== "H2") {
      items.push(n)
      n = n.nextElementSibling
    }
    if (!items.length) return
    const box = el("div", "atlas-summary")
    h.insertAdjacentElement("afterend", box)
    items.forEach((i) => box.appendChild(i))
  }

  // --- 3. Увеличение фото по клику ---
  function closeZoom() {
    document.querySelectorAll(".atlas-zoom").forEach((z) => z.remove())
    document.removeEventListener("keydown", onZoomKey)
  }
  function onZoomKey(e) {
    if (e.key === "Escape") closeZoom()
  }
  function openZoom(img) {
    closeZoom()
    const z = el("div", "atlas-zoom")
    z.setAttribute("role", "dialog")
    z.setAttribute("aria-label", "Фото крупно")
    const inner = el("div")
    const big = el("img")
    big.src = img.currentSrc || img.src
    big.alt = img.alt || ""
    inner.appendChild(big)
    const capP = img.closest("p") && img.closest("p").nextElementSibling
    if (capP && capP.tagName === "P" && capP.querySelector(":scope > em:only-child")) {
      inner.appendChild(el("div", "atlas-zoom-cap", capP.querySelector("em").innerHTML))
    }
    const btn = el("button", "", ICON_CLOSE)
    btn.type = "button"
    btn.setAttribute("aria-label", "Закрыть")
    z.append(inner, btn)
    z.addEventListener("click", closeZoom)
    document.addEventListener("keydown", onZoomKey)
    document.body.appendChild(z)
  }
  function photos(article) {
    article.querySelectorAll("p > img").forEach((img) => {
      if (img.closest("a") || img.dataset.atlas) return
      img.dataset.atlas = "1"
      const ic = el("span", "atlas-zoom-ic", ICON_ZOOM)
      ic.setAttribute("aria-hidden", "true")
      img.insertAdjacentElement("afterend", ic)
      img.addEventListener("click", () => openZoom(img))
    })
  }

  // --- 4. Кнопка «Содержание» и лист на телефоне ---
  function mobileToc(article) {
    document.querySelectorAll(".atlas-toc-fab, .atlas-toc-sheet").forEach((x) => x.remove())
    const heads = Array.from(article.querySelectorAll("h2[id], h3[id]"))
    if (heads.length < 3) return
    const fab = el("button", "atlas-toc-fab", ICON_LIST + "<span>Содержание</span>")
    fab.type = "button"
    const sheet = el(
      "div",
      "atlas-toc-sheet",
      '<div class="atlas-ts-shade"></div><div class="atlas-ts-panel" role="dialog" aria-label="Содержание">' +
        '<div class="atlas-ts-grip"></div><div class="atlas-ts-head"><span>Содержание</span>' +
        '<button type="button" aria-label="Закрыть">' + ICON_CLOSE + "</button></div>" +
        '<div class="atlas-ts-list"></div></div>',
    )
    const list = sheet.querySelector(".atlas-ts-list")
    const links = heads.map((hd) => {
      const a = el("a", hd.tagName === "H3" ? "d1" : "")
      a.href = "#" + hd.id
      a.textContent = text(hd)
      a.addEventListener("click", (e) => {
        e.preventDefault()
        close()
        hd.scrollIntoView()
        history.replaceState(null, "", "#" + hd.id)
      })
      list.appendChild(a)
      return a
    })
    const close = () => sheet.classList.remove("open")
    fab.addEventListener("click", () => {
      let cur = 0
      heads.forEach((hd, i) => {
        if (hd.getBoundingClientRect().top < 90) cur = i
      })
      links.forEach((a, i) => a.classList.toggle("cur", i === cur))
      sheet.classList.add("open")
      links[cur].scrollIntoView({ block: "center" })
    })
    sheet.querySelector(".atlas-ts-shade").addEventListener("click", close)
    sheet.querySelector(".atlas-ts-head button").addEventListener("click", close)
    document.body.append(fab, sheet)
  }

  // --- 5. Соседние занятия в конце конспекта ---
  async function lessonNav(article) {
    const m = slug().match(/^konspekty\/([^/]+)\/(\d+)-/)
    if (!m) return
    const idx = await contentIndex()
    if (!idx || document.querySelector(".atlas-lesson-nav")) return
    const folder = "konspekty/" + m[1] + "/"
    const lessons = Object.keys(idx)
      .filter((k) => k.startsWith(folder) && /^\d+-/.test(k.slice(folder.length)) && !k.slice(folder.length).includes("/"))
      .sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))
    const i = lessons.indexOf(slug())
    if (i < 0) return
    const folderTitle = (idx[folder + "index"] && idx[folder + "index"].title) || m[1]
    const href = (s) => base() + "/" + s
    const card = (s, cls, label) => {
      const a = el("a", "atlas-ln-card " + cls)
      a.href = href(s)
      a.append(el("span", "atlas-ln-k", label), el("span", "atlas-ln-t"))
      a.lastChild.textContent = (idx[s] && idx[s].title) || s
      return a
    }
    const nav = el("nav", "atlas-lesson-nav")
    nav.setAttribute("aria-label", "Занятия предмета")
    if (i > 0) nav.appendChild(card(lessons[i - 1], "atlas-ln-prev", "← Предыдущее занятие"))
    if (i < lessons.length - 1) nav.appendChild(card(lessons[i + 1], "atlas-ln-next", "Следующее занятие →"))
    const all = el("a", "atlas-ln-all")
    all.href = href(folder)
    all.textContent = "Все занятия: " + folderTitle
    nav.appendChild(all)
    article.insertAdjacentElement("afterend", nav)
  }

  function init() {
    const article = document.querySelector(".center article")
    if (!article || article.dataset.atlas) return
    article.dataset.atlas = "1"
    closeZoom()
    summaryPanel(article)
    photos(article)
    mobileToc(article)
    examChips(article)
    lessonNav(article)
  }

  document.addEventListener("nav", init)
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})()
