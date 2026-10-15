// Соседние занятия в конце конспекта: «← Предыдущее / Следующее →» и «Все занятия: <предмет>».
// Список берётся из contentIndex.json Quartz: конспекты той же папки, по порядку имён файлов (01-…, 02-…).
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch])

  async function init() {
    document.querySelectorAll(".lesson-nav").forEach((n) => n.remove())
    const slug = document.body.dataset.slug || ""
    const m = slug.match(/^konspekty\/([^/]+)\/([^/]+)$/)
    if (!m || m[2] === "index") return
    const root = "../".repeat(slug.split("/").length - 1)
    let data
    try {
      data = await (typeof fetchData !== "undefined" ? fetchData : fetch(root + "static/contentIndex.json").then((r) => r.json()))
    } catch (e) { return }
    if ((document.body.dataset.slug || "") !== slug) return
    const folder = "konspekty/" + m[1] + "/"
    const items = Object.keys(data)
      .filter((s) => s.startsWith(folder) && !s.slice(folder.length).includes("/") && s !== folder + "index")
      .sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))
    const i = items.indexOf(slug)
    const art = document.querySelector("article")
    if (i < 0 || !art) return
    const title = (s) => esc((data[s] && data[s].title) || s.split("/").pop())
    const card = (s, dir) =>
      s ? '<a class="lesson-nav-card ' + dir + '" href="' + root + s + '"><span>' +
        (dir === "prev" ? "← Предыдущее занятие" : "Следующее занятие →") + "</span><b>" + title(s) + "</b></a>" : ""
    const ft = data[folder + "index"] && data[folder + "index"].title
    const nav = document.createElement("nav")
    nav.className = "lesson-nav"
    nav.setAttribute("aria-label", "Занятия предмета")
    nav.innerHTML = card(items[i - 1], "prev") + card(items[i + 1], "next") +
      '<a class="lesson-nav-all" href="' + root + folder + '">Все занятия' + (ft ? ": " + esc(ft) : "") + "</a>"
    art.append(nav)
  }

  document.addEventListener("nav", init)
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})()
