// Карта вопросов на странице экзамена: сетка номеров, пройденные (расписанные как ### N. …) закрашены.
// Всего вопросов — наибольший номер среди расписанных и списка «Не пройдено» ([!todo]).
(function () {
  function init() {
    document.querySelectorAll(".exam-map").forEach((n) => n.remove())
    if (!/^ekzamen\/[^/]+\/index$/.test(document.body.dataset.slug || "")) return
    const art = document.querySelector("article")
    if (!art) return
    const done = new Map()
    art.querySelectorAll("h3[id]").forEach((h) => {
      const m = h.textContent.trim().match(/^(\d{1,3})\./)
      if (m) done.set(+m[1], h)
    })
    let total = 0
    done.forEach((_, n) => (total = Math.max(total, n)))
    art.querySelectorAll('.callout[data-callout="todo"] li').forEach((li) => {
      const m = li.textContent.trim().match(/^(\d{1,3})\./)
      if (m) total = Math.max(total, +m[1])
    })
    if (!total) return
    const nums = [...done.keys()].sort((a, b) => a - b)
    let cells = ""
    for (let n = 1; n <= total; n++) {
      const h = done.get(n)
      cells += h
        ? '<a class="on" href="#' + h.id + '" title="' + h.textContent.trim().replace(/"/g, "&quot;") + '">' + n + "</a>"
        : "<span>" + n + "</span>"
    }
    const box = document.createElement("div")
    box.className = "exam-map"
    box.innerHTML =
      '<div class="exam-map-head"><b>Карта вопросов</b><span><strong>' + nums.length + "</strong> из " + total + " пройдено</span>" +
      '<span class="exam-map-legend"><span><i class="on"></i>пройдено</span><span><i></i>не пройдено</span></span></div>' +
      '<div class="exam-map-grid">' + cells + "</div>" +
      (nums.length ? '<div class="exam-map-done"><span>Пройдено:</span>' + nums.map((n) => '<a href="#' + done.get(n).id + '">' + n + "</a>").join("") + "</div>" : "")
    const firstH2 = art.querySelector("h2")
    const table = [...art.querySelectorAll(".table-container")].find((t) => !firstH2 || t.compareDocumentPosition(firstH2) & Node.DOCUMENT_POSITION_FOLLOWING)
    if (table) table.after(box)
    else if (firstH2) firstH2.before(box)
    else art.prepend(box)
  }

  document.addEventListener("nav", init)
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})()
