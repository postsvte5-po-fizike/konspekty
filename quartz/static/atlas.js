// Сайт «Конспекты Стаса»: то, чего нет в пакете «Атлас 2».
// 1) Чипы «Вопросы экзамена» под заголовком конспекта — строятся из раздела «4. Экзаменационные вопросы»,
//    поэтому работают во всех конспектах без правки markdown (вид — как у выноски [!exam], стили в custom.scss).
// 2) Проводник не прокручивает страницу при открытии.
// Увеличение фото, «Содержание» на телефоне, соседние занятия, карта вопросов — скрипты пакета
// (static/zoom.js, toc-sheet.js, lesson-nav.js, exam-map.js); «Выжимка» и схемы — CSS пакета.
;(function () {
  "use strict"

  // Проводник Quartz без сохранённой позиции делает scrollIntoView() активного пункта —
  // это прокручивает всю страницу вниз при открытии. Даём ему позицию 0, он её восстановит.
  try {
    if (sessionStorage.getItem("explorerScrollTop") === null) sessionStorage.setItem("explorerScrollTop", "0")
  } catch (e) {}

  const pageCache = new Map()

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
        .split(/[.:;(,]/)[0]
        .trim()
        .replace(/^Топографическая анатомия\s+/, "Топография ")
        .replace(/^Оперативный доступ/, "Доступ")
        .replace(/^Оперативные доступы/, "Доступы")
        .replace(/^Синдром диссеминированного внутрисосудистого свертывания( крови)?/i, "ДВС-синдром")
      if (short.length > 44) short = short.slice(0, 42).replace(/\s+\S*$/, "") + "…"
      a.href = examUrl.href + "#" + rec.id
      a.title = rec.title
      a.textContent = a.textContent + ". " + short
    })
  }

  function init() {
    const article = document.querySelector(".center article")
    if (!article || article.dataset.atlas) return
    article.dataset.atlas = "1"
    examChips(article)
  }

  document.addEventListener("nav", init)
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})()
