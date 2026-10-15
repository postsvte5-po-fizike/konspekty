// Папки предметов в тренажёре тестов. Подключается после основного скрипта в quartz/static/testy/index.html:
//   <script src="testy-folders.js"></script>
// Работает поверх готового списка тем (section.deck[data-deck]), основной код не меняется.
// Папки и раскладка тем хранятся только в этом браузере (localStorage, ключ konspekty-testy-folders-v1).
(function () {
  "use strict"
  const KEY = "konspekty-testy-folders-v1"
  const app = document.getElementById("app")
  if (!app) return

  const DOTS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>'
  const FOLDER = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>'
  const CHEV = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
  const plural = (n, a, b, c) => { const t = n % 10, h = n % 100; return t === 1 && h !== 11 ? a : t >= 2 && t <= 4 && (h < 10 || h >= 20) ? b : c }

  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.folders)) return d } catch (e) {}
    return { folders: [], map: {}, closed: {}, hidden: [] }
  }
  let data = load()
  data.hidden = data.hidden || []
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch (e) {} }

  // темы без записи в map попадают в папку своего предмета (поле subject колоды), иначе в «Без папки»
  function folderOf(deckEl) {
    const id = deckEl.dataset.deck
    if (id in data.map) return data.map[id]
    const subj = (deckEl.querySelector(".deck-head .muted.small")?.textContent || "").split(" · ")[0].trim()
    if (!subj) return null
    let f = data.folders.find((x) => x.name === subj)
    if (!f) { f = { id: "f" + Date.now().toString(36) + data.folders.length, name: subj }; data.folders.push(f) }
    data.map[id] = f.id
    save()
    return f.id
  }

  // список перерисовывает основной код тренажёра (renderList — глобальная функция его скрипта)
  function rerender() { if (typeof window.renderList === "function") window.renderList(); else build() }
  let undoState = null
  function snap(text) { undoState = { text, prev: JSON.stringify(data) } }
  function hide(ids) {
    ids.forEach((id) => { if (!data.hidden.includes(id)) data.hidden.push(id) })
    // снять выбор у скрытых тем, чтобы они не попали в «Пройти выбранные»
    app.querySelectorAll("[data-pick]").forEach((cb) => { if (ids.includes(cb.dataset.pick) && cb.checked) { cb.checked = false; cb.dispatchEvent(new Event("change", { bubbles: true })) } })
  }
  function deckTitle(id) { return app.querySelector(`section.deck[data-deck="${CSS.escape(id)}"] .deck-open`)?.textContent.trim() || "тема" }

  let busy = false
  let menu = null
  function closeMenu() { if (menu) { menu.remove(); menu = null } }

  function openMenu(anchor, items) {
    closeMenu()
    menu = document.createElement("div")
    menu.className = "tf-menu"
    menu.setAttribute("role", "menu")
    menu.innerHTML = items.map((it, i) => it.sep ? '<div class="tf-sep"></div>' : it.head ? `<div class="tf-head">${esc(it.head)}</div>` :
      `<button type="button" role="menuitem" data-i="${i}" class="${it.cls || ""}"><span class="tf-mark">${it.mark || ""}</span><span>${esc(it.label)}</span></button>`).join("")
      + (items.note ? `<div class="tf-note">${esc(items.note)}</div>` : "")
    document.body.appendChild(menu)
    const r = anchor.getBoundingClientRect()
    const w = menu.offsetWidth
    menu.style.top = Math.min(window.innerHeight - menu.offsetHeight - 8, r.bottom + 4) + window.scrollY + "px"
    menu.style.left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) + "px"
    menu.onclick = (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; const it = items[+b.dataset.i]; closeMenu(); it.run() }
    menu.querySelector("button")?.focus()
  }
  document.addEventListener("click", (e) => { if (menu && !menu.contains(e.target) && !e.target.closest("[data-tf-menu]")) closeMenu() }, true)
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu() })

  // поле ввода названия прямо в списке: Enter — сохранить, Esc — отмена
  function nameField(place, value, onDone, label) {
    const box = document.createElement("div")
    box.className = "tf-edit"
    box.innerHTML = `<span class="tf-ico">${FOLDER}</span><input type="text" maxlength="60" placeholder="Название папки, например «Патофизиология»" aria-label="${esc(label)}"><button type="button" class="primary">${esc(label)}</button><button type="button" class="ghost">Отмена</button>`
    const input = box.querySelector("input")
    input.value = value || ""
    const [ok, cancel] = box.querySelectorAll("button")
    let done = false
    const finish = (save) => {
      if (done) return
      done = true
      const name = input.value.trim().slice(0, 60)
      box.remove()
      onDone(save && name ? name : null)
    }
    ok.onclick = () => finish(true)
    cancel.onclick = () => finish(false)
    input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); finish(true) } if (e.key === "Escape") { e.preventDefault(); finish(false) } }
    place(box)
    input.focus()
    input.select()
  }
  function newFolder(moveId) {
    const add = app.querySelector(".tf-new")
    if (!add) return
    add.hidden = true
    nameField((box) => add.before(box), "", (name) => {
      add.hidden = false
      if (!name) return
      const f = { id: "f" + Date.now().toString(36), name }
      data.folders.push(f)
      if (moveId) data.map[moveId] = f.id
      save(); build()
    }, "Создать")
  }

  let syncers = []
  app.addEventListener("click", (e) => { if (e.target.closest("#picker")) setTimeout(() => syncers.forEach((f) => f()), 0) })
  function build() {
    syncers = []
    const decks = [...app.querySelectorAll("section.deck[data-deck]")]
    if (!decks.length) return
    busy = true
    closeMenu()
    const host = decks[0].parentElement
    app.querySelectorAll(".tf-edit, .tf-hidden-row, .tf-undo").forEach((n) => n.remove())
    app.querySelectorAll(".tf-group, .tf-new").forEach((n) => { n.querySelectorAll("section.deck").forEach((d) => host.insertBefore(d, n)); n.remove() })
    const first = decks[0]
    const anchor = document.createComment("tf")
    host.insertBefore(anchor, first)

    decks.forEach((d) => { d.hidden = data.hidden.includes(d.dataset.deck) })
    // сначала создать недостающие папки предметов, иначе при первом открытии темы уходят в «Без папки»
    decks.filter((d) => !d.hidden).forEach((d) => folderOf(d))
    const groups = [...data.folders.map((f) => ({ f, list: [] })), { f: null, list: [] }]
    decks.filter((d) => !d.hidden).forEach((d) => {
      const fid = folderOf(d)
      const g = groups.find((x) => (x.f ? x.f.id : null) === fid) || groups[groups.length - 1]
      g.list.push(d)
    })
    // folderOf мог создать папки — перестроить порядок групп
    const order = [...data.folders.map((f) => groups.find((g) => g.f && g.f.id === f.id) || { f, list: [] }), groups[groups.length - 1]]
    order.forEach((g) => {
      if (!g.f && !g.list.length) return
      const gid = g.f ? g.f.id : ""
      const closed = !!data.closed[gid]
      const el = document.createElement("div")
      el.className = "tf-group" + (closed ? " is-closed" : "")
      el.dataset.folder = gid
      const n = g.list.length
      el.innerHTML = `<div class="tf-bar">
        ${n ? '<input type="checkbox" class="tf-pick" aria-label="Выбрать все темы папки">' : '<span class="tf-pick-gap"></span>'}
        <button type="button" class="tf-toggle" aria-expanded="${!closed}"><span class="tf-chev">${CHEV}</span><span class="tf-ico${g.f ? "" : " is-none"}">${FOLDER}</span><span class="tf-name">${esc(g.f ? g.f.name : "Без папки")}</span><span class="tf-count">${n} ${plural(n, "тема", "темы", "тем")}</span></button>
        ${g.f ? `<button type="button" class="tf-more" data-tf-menu aria-label="Действия с папкой">${DOTS}</button>` : ""}
      </div><div class="tf-body"></div>`
      const body = el.querySelector(".tf-body")
      g.list.forEach((d) => body.appendChild(d))
      if (!n) body.innerHTML = '<p class="tf-empty">Папка пуста. Перетащите сюда тему или выберите папку в меню ⋯ у темы.</p>'
      host.insertBefore(el, anchor)

      const pick = el.querySelector(".tf-pick")
      if (pick) {
        const boxes = () => [...el.querySelectorAll(".tf-body [data-pick]")]
        const sync = () => {
          const b = boxes(), on = b.filter((x) => x.checked).length
          pick.checked = b.length > 0 && on === b.length
          pick.indeterminate = on > 0 && on < b.length
        }
        sync()
        el.querySelector(".tf-body").addEventListener("change", (e) => { if (e.target.matches("[data-pick]")) sync() })
        // основной код слушает onchange каждой темы — переключаем их по одной, чтобы выбор сохранился
        pick.onchange = () => {
          const want = pick.checked
          boxes().forEach((cb) => { if (cb.checked !== want) { cb.checked = want; cb.dispatchEvent(new Event("change", { bubbles: true })) } })
          sync()
        }
        syncers.push(sync)
      }
      el.querySelector(".tf-toggle").onclick = () => { data.closed[gid] = !data.closed[gid]; save(); el.classList.toggle("is-closed"); el.querySelector(".tf-toggle").setAttribute("aria-expanded", String(!data.closed[gid])) }
      const more = el.querySelector(".tf-more")
      if (more) more.onclick = () => {
        const items = [
          { label: "Переименовать", run: () => {
            const bar = el.querySelector(".tf-bar")
            bar.hidden = true
            nameField((box) => bar.after(box), g.f.name, (nm) => { bar.hidden = false; if (nm) { g.f.name = nm; save(); build() } }, "Готово")
          } },
          { sep: true },
          { label: "Удалить только папку", cls: "is-danger", run: () => {
            snap(`Папка «${g.f.name}» удалена, темы перенесены в «Без папки».`)
            data.folders = data.folders.filter((x) => x !== g.f)
            Object.keys(data.map).forEach((k) => { if (data.map[k] === g.f.id) data.map[k] = null })
            save(); build()
          } },
          { label: "Удалить папку с темами", cls: "is-danger is-strong", run: () => {
            const ids = g.list.map((x) => x.dataset.deck)
            snap(`Папка «${g.f.name}» и ${ids.length} ${plural(ids.length, "тема", "темы", "тем")} удалены.`)
            data.folders = data.folders.filter((x) => x !== g.f)
            hide(ids); save(); rerender()
          } },
        ]
        items.note = "Результаты тестов не удаляются. Удалённые темы можно вернуть внизу списка."
        openMenu(more, items)
      }
      el.addEventListener("dragover", (e) => { if (!app.classList.contains("tf-dragging")) return; e.preventDefault(); el.classList.add("is-over") })
      el.addEventListener("dragleave", (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove("is-over") })
      el.addEventListener("drop", (e) => {
        e.preventDefault(); el.classList.remove("is-over")
        const id = e.dataTransfer.getData("text/plain")
        if (id) { data.map[id] = g.f ? g.f.id : null; save(); build() }
      })
    })
    anchor.remove()

    const add = document.createElement("button")
    add.type = "button"
    add.className = "tf-new"
    add.innerHTML = "<span>+</span>Новая папка"
    add.onclick = () => newFolder(null)
    const lastGroup = app.querySelectorAll(".tf-group")
    lastGroup[lastGroup.length - 1].after(add)
    let tail = add
    if (data.hidden.length) {
      const n = data.hidden.length
      const row = document.createElement("div")
      row.className = "tf-hidden-row"
      row.innerHTML = `<span>Удалено из списка: ${n} ${plural(n, "тема", "темы", "тем")}. Результаты сохранены.</span><button type="button" class="ghost">Вернуть все</button>`
      row.querySelector("button").onclick = () => { snap("Все темы возвращены."); data.hidden = []; save(); rerender() }
      tail.after(row); tail = row
    }
    if (undoState) {
      const u = undoState
      const bar = document.createElement("div")
      bar.className = "tf-undo"
      bar.setAttribute("role", "status")
      bar.innerHTML = `<span>${esc(u.text)}</span><button type="button" class="tf-undo-btn">Отменить</button><button type="button" class="tf-undo-x" aria-label="Закрыть">✕</button>`
      bar.querySelector(".tf-undo-btn").onclick = () => { data = JSON.parse(u.prev); undoState = null; save(); rerender() }
      bar.querySelector(".tf-undo-x").onclick = () => { undoState = null; bar.remove() }
      tail.after(bar)
      clearTimeout(build._t)
      build._t = setTimeout(() => { if (undoState === u) { undoState = null; bar.remove() } }, 8000)
    }

    decks.forEach((d) => {
      const id = d.dataset.deck
      d.draggable = true
      d.ondragstart = (e) => { if (e.target.closest("button, input, a")) return; e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; app.classList.add("tf-dragging"); d.classList.add("is-dragged") }
      d.ondragend = () => { app.classList.remove("tf-dragging"); d.classList.remove("is-dragged"); app.querySelectorAll(".is-over").forEach((x) => x.classList.remove("is-over")) }
      const row = d.querySelector(":scope > .row")
      if (row && !row.querySelector(".tf-more")) {
        const b = document.createElement("button")
        b.type = "button"; b.className = "tf-more"; b.dataset.tfMenu = ""; b.setAttribute("aria-label", "Переместить в папку"); b.innerHTML = DOTS
        row.appendChild(b)
        b.onclick = (e) => {
          e.stopPropagation()
          const cur = data.map[id] ?? null
          const items = [{ head: "Переместить в папку" },
            ...data.folders.map((f) => ({ label: f.name, mark: f.id === cur ? "✓" : "", run: () => { data.map[id] = f.id; save(); build() } })),
            { label: "Без папки", mark: cur === null ? "✓" : "", run: () => { data.map[id] = null; save(); build() } },
            { sep: true },
            { label: "Новая папка…", mark: "+", cls: "is-link", run: () => newFolder(id) },
            { sep: true },
            { label: "Удалить тему", cls: "is-danger", run: () => {
              const own = d.querySelector("[data-remove]")
              if (own) { own.click(); return } // своя колода: удаление основным кодом, с подтверждением
              snap(`Тема «${deckTitle(id)}» удалена из списка.`)
              hide([id]); save(); rerender()
            } }]
          openMenu(b, items)
        }
      }
    })
    busy = false
  }

  new MutationObserver(() => { if (!busy && app.querySelector("section.deck[data-deck]") && !app.querySelector(".tf-group")) build() })
    .observe(app, { childList: true, subtree: true })
  if (app.querySelector("section.deck[data-deck]")) build()
})()
