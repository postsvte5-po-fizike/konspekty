# Quartz v5

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Медицинские конспекты

Агент использует материалы из соседних папок `../_библиотека/` и `../_система/`. В открытом Codex выберите один из семи навыков через `/skills`. Для работы из терминала установите `study`.

### Установка команды на macOS

Убедитесь, что `node` и `codex` доступны в терминале. Из корня этого репозитория выполните:

```sh
mkdir -p "$HOME/.local/bin"
ln -s "$(pwd -P)/scripts/study.mjs" "$HOME/.local/bin/study"
export PATH="$HOME/.local/bin:$PATH"
```

Если `~/.local/bin` ещё не добавлен в `PATH`, сохраните строку `export PATH="$HOME/.local/bin:$PATH"` в `~/.zshrc` для новых сессий. Если репозиторий переедет, создайте ссылку заново с новым путём. После установки запускайте команду из любой директории:

```sh
study --help
study tomorrow
study note patanat 6
study exam patanat q 24–26
study case emergency
study surgery "Пластика ПКС"
study english status
study digest 2026-09
```

Команда открывает интерактивную сессию Codex в корне сайта. `study note` принимает номер или название темы. Для аудита экзамена используйте `study exam patanat`, для тренировки — `study exam patanat train`. Личные результаты остаются в локальной системе.

Ранее установленный `konspekt patanat 6` вызывает тот же навык, что и `study note patanat 6`. Для установки совместимого имени выполните из корня сайта `ln -s "$(pwd -P)/scripts/konspekt.mjs" "$HOME/.local/bin/konspekt"`.

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>
