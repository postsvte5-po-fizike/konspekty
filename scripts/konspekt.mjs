#!/usr/bin/env node

import { runStudy } from "./study.mjs"

const args = process.argv.slice(2)
if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
  console.log("Использование: konspekt <предмет> <номер или название темы>")
} else {
  runStudy(["note", ...args], "konspekt")
}
