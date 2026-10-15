// Оглавление на телефоне: кнопка «Содержание» внизу экрана и лист с пунктами оглавления.
// Пункты берутся из оглавления Quartz (.toc ul.toc-content); на широком экране кнопку скрывает CSS.
(function () {
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/></svg>'
  const CLOSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  let sheet = null

  function close() {
    if (!sheet || sheet.hidden) return
    sheet.classList.remove("is-open")
    document.documentElement.classList.remove("toc-sheet-open")
    setTimeout(() => { if (sheet && !sheet.classList.contains("is-open")) sheet.hidden = true }, 250)
  }

  function markCurrent(list) {
    const heads = [...document.querySelectorAll("article :is(h1, h2, h3)[id]")]
    let cur = null
    for (const h of heads) { if (h.getBoundingClientRect().top <= 90) cur = h; else break }
    list.querySelectorAll("a").forEach((a) => {
      const on = !!cur && decodeURIComponent(a.hash.slice(1)) === cur.id
      a.classList.toggle("is-current", on)
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current")
    })
  }

  function init() {
    document.querySelectorAll(".toc-fab, .toc-sheet").forEach((n) => n.remove())
    document.documentElement.classList.remove("has-toc-sheet", "toc-sheet-open")
    sheet = null
    const src = document.querySelector(".toc ul.toc-content")
    if (!src || !src.querySelector("a")) return

    const fab = document.createElement("button")
    fab.type = "button"
    fab.className = "toc-fab"
    fab.innerHTML = ICON + "<span>Содержание</span>"

    sheet = document.createElement("div")
    sheet.className = "toc-sheet"
    sheet.hidden = true
    sheet.innerHTML =
      '<div class="toc-sheet-backdrop"></div>' +
      '<div class="toc-sheet-panel" role="dialog" aria-modal="true" aria-label="Содержание">' +
      '<div class="toc-sheet-grip"></div>' +
      '<div class="toc-sheet-head"><span>Содержание</span><button type="button" class="toc-sheet-close" aria-label="Закрыть">' + CLOSE + "</button></div>" +
      '<nav class="toc-sheet-body"></nav></div>'
    const list = src.cloneNode(true)
    list.className = "toc-sheet-list"
    list.removeAttribute("id")
    list.querySelectorAll("a").forEach((a) => a.classList.remove("in-view"))
    const body = sheet.querySelector(".toc-sheet-body")
    body.appendChild(list)
    document.body.append(fab, sheet)
    document.documentElement.classList.add("has-toc-sheet")

    fab.addEventListener("click", () => {
      markCurrent(list)
      sheet.hidden = false
      document.documentElement.classList.add("toc-sheet-open")
      requestAnimationFrame(() => sheet.classList.add("is-open"))
      const cur = list.querySelector("a.is-current")
      body.scrollTop = cur ? cur.offsetTop - 80 : 0
      sheet.querySelector(".toc-sheet-close").focus()
    })
    sheet.querySelector(".toc-sheet-backdrop").addEventListener("click", close)
    sheet.querySelector(".toc-sheet-close").addEventListener("click", close)
    list.addEventListener("click", (e) => { if (e.target.closest("a")) close() })
  }

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close() })
  document.addEventListener("nav", init)
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})()
