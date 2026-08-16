import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const envLocal = path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(envLocal)) {
  const dotenv = await import('dotenv');
  dotenv.config({
    path: envLocal,
    override: false,
  });
}

const required = [
  'IRIS_API_ID',
  'IRIS_API_HASH',
  'IRIS_SESSION',
  'IRIS_CHAT_BLACK',
  'IRIS_CHAT_BLUE',
  'NEXT_PUBLIC_APP_URL',
  'ADMIN_SYNC_SECRET',
];

const missing = required.filter(
  key => !process.env[key]
);

if (missing.length) {
  throw new Error(
    `Не заданы переменные: ${missing.join(', ')}`
  );
}

const apiId = Number(
  process.env.IRIS_API_ID
);

const apiHash = String(
  process.env.IRIS_API_HASH
);

const sessionString = String(
  process.env.IRIS_SESSION
);

const appUrl = String(
  process.env.NEXT_PUBLIC_APP_URL
).replace(/\/$/, '');

const syncUrl =
  `${appUrl}/api/admins/internal/sync`;

const IRIS_BOT_ID = '5443619563';

const POLL_MS = Math.max(
  750,
  Number(
    process.env.IRIS_POLL_MS || 1000
  )
);

const AUTO_REQUEST =
  process.env.IRIS_AUTO_REQUEST_ENABLED === 'true';

const AUTO_REQUEST_INTERVAL_MS =
  Math.max(
    60_000,
    Number(
      process.env.IRIS_AUTO_REQUEST_INTERVAL_MS ||
      900_000
    )
  );

const SCAN_LIMIT = Math.max(
  50,
  Math.min(
    Number(
      process.env.IRIS_SCAN_LIMIT || 500
    ),
    5000
  )
);

const CHAT_CONFIG = [
  {
    name: 'BLACK',
    title: 'ЦДК 🥶 ЧАТ 🤬#1',
    id: String(
      process.env.IRIS_CHAT_BLACK
    ),
  },
  {
    name: 'BLUE',
    title: 'ЦДК 🥶 ЧАТ 🤬#2',
    id: String(
      process.env.IRIS_CHAT_BLUE
    ),
  },
];

const client = new TelegramClient(
  new StringSession(sessionString),
  apiId,
  apiHash,
  {
    connectionRetries: 10,
  },
);

function normalizeId(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value);
}

function normalizeTitle(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMessageSenderId(message) {
  return normalizeId(
    message?.senderId?.userId ??
    message?.fromId?.userId ??
    ''
  );
}

function isIrisMessage(message) {
  return (
    getMessageSenderId(message) ===
    IRIS_BOT_ID
  );
}

function validSnapshot(text) {
  return (
    /[⭐]/u.test(text) &&
    /(Владелец|Гл\s*Админ|Админ|Ст\.стажер|Ст\.стажёр|Стажер|Стажёр|Император|Рука Императора|Инквизитор|Имперский маг|Императорский гвардеец)/iu.test(
      text
    )
  );
}

function cleanMemberLine(line) {
  return line
    .replace(
      /^(⚪️|⚪|🟢|🟡|🔴|🔵|🟠|🟣|⚫|🔘)\s*/u,
      ''
    )
    .trim();
}

function isRankLine(line) {
  const title = line
    .replace(/[⭐️⭐]/gu, '')
    .trim()
    .toLocaleLowerCase('ru-RU');

  return /^(император|владелец|рука императора|гл админ|главный админ|инквизитор|админ|имперский маг|ст\.стажер|ст\.стажёр|стажер|стажёр|императорский гвардеец)$/iu.test(
    title
  );
}

function lineRanges(text) {
  const result = [];
  let start = 0;

  for (
    const raw of text.split('\n')
  ) {
    const end =
      start + raw.length;

    result.push({
      raw,
      start,
      end,
      trimmed: raw.trim(),
    });

    start = end + 1;
  }

  return result;
}

async function pushSnapshot(
  group,
  message
) {
  const text = String(
    message?.message || ''
  ).trim();

  // Обрабатываем только сообщения от Iris
  // и только сообщения, похожие на актуальный
  // список ролей.
  if (
    !validSnapshot(text) ||
    !isIrisMessage(message)
  ) {
    return false;
  }

  /*
   * Telegram ID пользователей здесь НЕ определяется.
   *
   * На сайт отправляется исходный текст Iris.
   *
   * Сервер сам разбирает этот текст через
   * parseIrisMessage().
   *
   * Поэтому здесь НЕТ:
   *
   * - iterParticipants
   * - getParticipants
   * - getEntity для каждого пользователя
   * - поиска Telegram ID участников
   *
   * Это также устраняет прежние flood wait.
   */

  const response = await fetch(
    syncUrl,
    {
      method: 'POST',

      headers: {
        'content-type':
          'application/json',

        'x-admin-sync-secret':
          process.env.ADMIN_SYNC_SECRET,
      },

      body: JSON.stringify({
        group: group.name,
        text,
        sourceChat: group.id,
      }),
    }
  );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Sync HTTP ${response.status}: ${body}`
    );
  }

  let result = null;

  try {
    result = JSON.parse(body);
  } catch {
    // Сервер мог вернуть обычный текст.
  }

  console.log('');
  console.log(
    '========================================'
  );

  console.log(
    `✓ IRIS SYNC [${group.name}]`
  );

  console.log(
    `Message ID: ${message.id}`
  );

  console.log(
    `Chat: ${group.title} (${group.id})`
  );

  console.log(
    `Sender: Iris (id ${IRIS_BOT_ID})`
  );

  console.log(
    'Telegram ID пользователей: НЕ ИСПОЛЬЗУЕТСЯ'
  );

  if (result?.result) {
    console.log(
      `Синхронизация: ${JSON.stringify(
        result.result
      )}`
    );
  } else if (result) {
    console.log(
      `Ответ сервера: ${JSON.stringify(
        result
      )}`
    );
  }

  console.log(
    '========================================'
  );

  console.log('');

  return true;
}

async function authorize() {
  console.log('');
  console.log(
    'Подключение к Telegram...'
  );

  await client.connect();

  if (
    await client.isUserAuthorized()
  ) {
    console.log(
      '✓ Telegram userbot уже авторизован.'
    );

    return;
  }

  throw new Error(
    'IRIS_SESSION недействителен или отсутствует.'
  );
}

async function resolveChats() {
  const dialogs =
    await client.getDialogs({
      limit: 1000,
    });

  const groups = new Map();

  for (
    const config of CHAT_CONFIG
  ) {
    let found = null;

    try {
      found =
        await client.getEntity(
          config.id
        );
    } catch {
      // fallback ниже
    }

    const dialog =
      dialogs.find(
        d =>
          normalizeId(d.id) ===
          config.id ||
          normalizeTitle(d.title) ===
          normalizeTitle(
            config.title
          )
      );

    const entity =
      found ||
      dialog?.entity;

    if (!entity) {
      throw new Error(
        `Не найден чат "${config.title}" (${config.id}).`
      );
    }

    const group = {
      name: config.name,

      title:
        dialog?.title ||
        config.title,

      entity,

      id: config.id,
    };

    groups.set(
      config.name,
      group
    );

    console.log(
      `✓ ${group.name}: ${group.title} (${group.id})`
    );
  }

  return groups;
}

async function findLatestSnapshot(
  group
) {
  for await (
    const message of client.iterMessages(
      group.entity,
      {
        limit: SCAN_LIMIT,
      }
    )
  ) {
    if (
      isIrisMessage(message) &&
      validSnapshot(
        String(
          message?.message || ''
        )
      )
    ) {
      return message;
    }
  }

  return null;
}

await authorize();

const groups =
  await resolveChats();

console.log('');
console.log(
  '========================================'
);

console.log(
  'TELEGRAM CONNECTED'
);

console.log(
  '✓ IRIS FILTER BY ID ACTIVE'
);

console.log(
  '✓ POLLING + SITE SYNC ACTIVE'
);

console.log(
  '========================================'
);

const lastSeen = new Map();

for (
  const group of groups.values()
) {
  const latest =
    await findLatestSnapshot(
      group
    );

  if (latest) {
    await pushSnapshot(
      group,
      latest
    );

    lastSeen.set(
      group.name,
      Number(
        latest.id || 0
      )
    );

    console.log(
      `✓ ${group.name}: последний Iris snapshot ${latest.id} синхронизирован.`
    );
  } else {
    const latestMessage =
      await client.getMessages(
        group.entity,
        {
          limit: 1,
        }
      );

    lastSeen.set(
      group.name,
      Number(
        latestMessage?.[0]?.id ||
        0
      )
    );

    console.log(
      `• ${group.name}: Iris snapshot в последних ${SCAN_LIMIT} сообщениях не найден.`
    );
  }
}

console.log('');

console.log(
  `Проверка новых сообщений каждые ${POLL_MS} мс...`
);

console.log(
  'Ожидание новых сообщений...'
);

let pollingBusy = false;

async function pollOnce() {
  if (pollingBusy) {
    return;
  }

  pollingBusy = true;

  try {
    for (
      const group of groups.values()
    ) {
      const previousId =
        Number(
          lastSeen.get(
            group.name
          ) || 0
        );

      let messages;

      try {
        messages =
          await client.getMessages(
            group.entity,
            {
              limit: 100,
              minId: previousId,
            }
          );
      } catch (error) {
        console.error(
          `[${group.name}] ошибка получения сообщений:`,
          error?.message ||
          error
        );

        continue;
      }

      if (!messages?.length) {
        continue;
      }

      messages.sort(
        (a, b) =>
          Number(a.id || 0) -
          Number(b.id || 0)
      );

      for (
        const message of messages
      ) {
        const messageId =
          Number(
            message?.id || 0
          );

        if (
          !messageId ||
          messageId <= previousId
        ) {
          continue;
        }

        if (
          messageId >
          Number(
            lastSeen.get(
              group.name
            ) || 0
          )
        ) {
          lastSeen.set(
            group.name,
            messageId
          );
        }

        /*
         * Фильтр только по отправителю Iris.
         */
        if (
          !isIrisMessage(message)
        ) {
          continue;
        }

        /*
         * Не каждое сообщение Iris
         * является списком админов.
         */
        if (
          !validSnapshot(
            String(
              message?.message ||
              ''
            )
          )
        ) {
          continue;
        }

        try {
          await pushSnapshot(
            group,
            message
          );
        } catch (error) {
          console.error(
            `[${group.name}] ошибка синхронизации Iris:`,
            error?.message ||
            error
          );
        }
      }
    }
  } catch (error) {
    console.error(
      '[POLL ERROR]',
      error?.message ||
      error
    );
  } finally {
    pollingBusy = false;
  }
}

await pollOnce();

/*
 * Необязательный Telegram Bot API.
 *
 * Используется только если в .env.local
 * задан TELEGRAM_BOT_TOKEN.
 */

const botApi =
  process.env.TELEGRAM_BOT_TOKEN
    ? `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
    : '';

let lastAutoRequestAt = 0;

let automationConfig = {
  enabled: false,
  requestedAt: '',
};

async function refreshAutomationConfig() {
  try {
    const response =
      await fetch(
        `${appUrl}/api/admins/internal/automation`,
        {
          headers: {
            'x-admin-sync-secret':
              process.env.ADMIN_SYNC_SECRET,
          },
        }
      );

    if (!response.ok) {
      return;
    }

    const json =
      await response.json();

    automationConfig = {
      enabled:
        Boolean(
          json?.automation?.enabled
        ),

      requestedAt:
        String(
          json?.automation
            ?.syncRequestedAt ||
          ''
        ),
    };
  } catch (error) {
    console.error(
      'AUTOMATION CONFIG:',
      error?.message ||
      error
    );
  }
}

async function requestIrisAutomatically() {
  /*
   * Если Bot API token не задан,
   * monitor всё равно работает.
   */

  if (!botApi) {
    return;
  }

  await refreshAutomationConfig();

  const enabled =
    AUTO_REQUEST ||
    automationConfig.enabled;

  if (!enabled) {
    return;
  }

  const requested =
    Boolean(
      automationConfig.requestedAt
    );

  if (
    !requested &&
    Date.now() -
    lastAutoRequestAt <
    AUTO_REQUEST_INTERVAL_MS
  ) {
    return;
  }

  if (
    requested &&
    Date.now() -
    lastAutoRequestAt <
    60_000
  ) {
    return;
  }

  for (
    const group of groups.values()
  ) {
    try {
      const response =
        await fetch(
          `${botApi}/sendMessage`,
          {
            method: 'POST',

            headers: {
              'content-type':
                'application/json',
            },

            body: JSON.stringify({
              chat_id: group.id,
              text: 'кто админ',
            }),
          }
        );

      const json =
        await response.json();

      if (!json.ok) {
        throw new Error(
          json.description ||
          'Telegram Bot API error'
        );
      }

      console.log(
        `✓ AUTO REQUEST ${group.name}: кто админ`
      );
    } catch (error) {
      console.error(
        `AUTO REQUEST ${group.name}:`,
        error?.message ||
        error
      );
    }
  }

  lastAutoRequestAt =
    Date.now();
}

await requestIrisAutomatically();

const timer =
  setInterval(
    () => {
      pollOnce().catch(
        error =>
          console.error(
            '[POLL TIMER]',
            error
          )
      );

      requestIrisAutomatically().catch(
        error =>
          console.error(
            '[AUTO REQUEST]',
            error
          )
      );
    },
    POLL_MS
  );

async function shutdown(signal) {
  console.log(
    `\nПолучен ${signal}, останавливаю Iris monitor...`
  );

  clearInterval(timer);

  await client.disconnect();

  process.exit(0);
}

process.on(
  'SIGINT',
  () => shutdown('SIGINT')
);

process.on(
  'SIGTERM',
  () => shutdown('SIGTERM')
);