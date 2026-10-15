// Увеличение фото по клику. Работает со SPA-навигацией Quartz (делегирование на document).
// Клик по фото → во весь экран; ещё клик по картинке → в натуральную величину с прокруткой;
// клик по фону, ✕ или Esc → закрыть.
(() => {
  if (window.__zoomReady) return
  window.__zoomReady = true

  let box = null
  const close = () => {
    if (!box) return
    box.remove()
    box = null
    document.documentElement.style.overflow = ""
  }

  const open = (img) => {
    close()
    box = document.createElement("div")
    box.className = "zoom-box"
    box.setAttribute("role", "dialog")
    box.setAttribute("aria-label", "Увеличенное изображение")

    const fig = document.createElement("figure")
    fig.style.margin = "0"
    fig.style.display = "flex"
    fig.style.flexDirection = "column"
    fig.style.alignItems = "center"

    const big = document.createElement("img")
    big.src = img.currentSrc || img.src
    big.alt = img.alt || ""
    big.style.cursor = "zoom-in"
    fig.appendChild(big)

    // подпись: следующий абзац с курсивом
    const p = img.closest("p")
    const cap = p && p.nextElementSibling
    if (cap && cap.tagName === "P" && cap.querySelector(":scope > em")) {
      const fc = document.createElement("figcaption")
      fc.textContent = cap.textContent.trim()
      fig.appendChild(fc)
    }

    const btn = document.createElement("button")
    btn.className = "zoom-close"
    btn.type = "button"
    btn.setAttribute("aria-label", "Закрыть")
    btn.textContent = "✕"

    box.append(fig, btn)
    document.body.appendChild(box)
    document.documentElement.style.overflow = "hidden"
    btn.focus()

    big.addEventListener("click", (e) => {
      e.stopPropagation()
      const full = box.classList.toggle("is-full")
      big.style.cursor = full ? "zoom-out" : "zoom-in"
    })
    box.addEventListener("click", close)
    btn.addEventListener("click", close)
  }

  document.addEventListener("click", (e) => {
    const img = e.target.closest && e.target.closest("article p > img:only-child")
    if (!img || img.closest("a")) return
    e.preventDefault()
    open(img)
  })
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close() })
  document.addEventListener("nav", close)
})()
