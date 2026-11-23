#!/usr/bin/env node

import { spawn } from "node:child_process"
import { realpathSync, statSync } from "node:fs"
import { constants } from "node:os"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const subjects = ["patanat", "patfiz", "topanat", "propedevtika", "farma", "obshaya-hirurgiya"]
const syntax = {
  tomorrow: "[ДД.ММ.ГГГГ]",
  note: "<предмет> <номер или название темы>",
  exam: "<предмет> [status | q <диапазон> | train]",
  case: "[предмет | trauma | emergency]",
  surgery: "<операция>",
  english: "[lesson | review | status]",
  digest: "[YYYY-MM]",
}
const usage = [
  "Использование:",
  ...Object.entries(syntax).map(([command, args]) => `  study ${command} ${args}`),
  `Предметы: ${subjects.join(", ")}`,
].join("\n")

function validDate(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
  if (!match || match[0] !== value || match[3] === "0000") return false
  const [, day, month, year] = match
  const iso = `${year}-${month}-${day}`
  const date = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(iso)
}

function lessonTopic(values) {
  const topic = values.join(" ").trim()
  if (!topic) return null
  if (/^[+-]?[0-9]+(?:[.,][0-9]+)?$/.test(topic)) {
    return /^[0-9]+$/.test(topic) && /[1-9]/.test(topic) ? topic.replace(/^0+/, "") : null
  }
  return topic
}

function examRange(values) {
  const range = values.join(" ").trim().replace(/\s*([,–—-])\s*/g, "$1").replace(/[–—]/g, "-")
  const id = "(?:(?:I|II|[PП])\\.)?0*[1-9][0-9]*"
  return new RegExp(`^${id}(?:-${id})?(?:,${id}(?:-${id})?)*$`, "i").test(range) ? range : null
}

function validate(command, args) {
  const [first, mode, ...rest] = args
  switch (command) {
    case "tomorrow":
      return !args.length || (args.length === 1 && validDate(first)) ? args : null
    case "note": {
      const topic = lessonTopic(args.slice(1))
      return subjects.includes(first) && topic ? [first, topic] : null
    }
    case "exam": {
      if (!subjects.includes(first)) return null
      if (args.length === 1 || (args.length === 2 && ["status", "train"].includes(mode))) return args
      const range = mode === "q" ? examRange(rest) : null
      return range ? [first, mode, range] : null
    }
    case "case":
      return !args.length || (args.length === 1 && [...subjects, "trauma", "emergency"].includes(first)) ? args : null
    case "surgery": {
      const operation = args.join(" ").trim()
      return operation ? [operation] : null
    }
    case "english":
      return !args.length || (args.length === 1 && ["lesson", "review", "status"].includes(first)) ? args : null
    case "digest":
      return !args.length || (args.length === 1 && first.length === 7 && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(first)) ? args : null
  }
}

export function runStudy(argv, program = "study") {
  try {
    const [command, ...args] = argv
    if (argv.length === 1 && ["--help", "-h"].includes(command)) {
      console.log(usage)
      return
    }
    if (!Object.hasOwn(syntax, command)) throw new Error(`Укажите одну из доступных команд.\n${usage}`)
    if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
      console.log(`Использование: study ${command} ${syntax[command]}`)
      return
    }
    const values = args.some((arg) => /[\u0000-\u001f\u007f]/.test(arg)) ? null : validate(command, args)
    if (!values) throw new Error(`Неверные аргументы. Использование: study ${command} ${syntax[command]}`)

    const root = resolve(dirname(realpathSync(fileURLToPath(import.meta.url))), "..")
    const skill = `.agents/skills/${command}/SKILL.md`
    for (const instruction of ["AGENTS.md", skill]) {
      const file = resolve(root, instruction)
      if (!statSync(file, { throwIfNoEntry: false })?.isFile()) {
        throw new Error(`Файл инструкций недоступен: ${file}`)
      }
    }

    const prompt = `Используй навык $${command}. Прочитай AGENTS.md и ${skill}. Аргументы команды study ${command}: ${JSON.stringify(values)}.`
    const codex = spawn("codex", ["--cd", root, prompt], { cwd: root, stdio: "inherit", shell: false })
    codex.on("error", (error) => {
      console.error(error.code === "ENOENT"
        ? `${program}: Codex CLI не найден в PATH.`
        : `${program}: не удалось запустить Codex CLI: ${error.message}`)
      process.exitCode = error.code === "ENOENT" ? 127 : 1
    })
    codex.on("exit", (code, signal) => {
      process.exitCode = code ?? (128 + (constants.signals[signal] ?? 1))
    })
  } catch (error) {
    console.error(`${program}: ${error.message}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runStudy(process.argv.slice(2))
}
