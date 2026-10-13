const chatContent = document.querySelector('#chat-content');
const channelTitle = document.querySelector('#channel-title');
const examples = {
  general: { title: 'общий', heading: 'Ну что, собираемся?', description: 'Хороший вечер начинается со своих.', messages: [['М', 'pink', 'masha', 'кто в голос? есть одна история 👀'], ['Д', 'green', 'danil', 'я тут. запускай, мы слушаем'], ['Т', 'orange', 'ты', 'это будет легендарно ✨']] },
  memes: { title: 'мемы', heading: 'Только свои поймут.', description: 'Место для локальных легенд.', messages: [['Д', 'green', 'danil', 'когда сказал «последняя катка» три часа назад'], ['М', 'pink', 'masha', 'мы: ещё одну и точно спать 😭'], ['Т', 'orange', 'ты', 'скиньте сюда, это надо сохранить']] },
  plans: { title: 'планы-на-вечер', heading: 'Вечер уже придумали.', description: 'Осталось собраться вместе.', messages: [['М', 'pink', 'masha', 'сегодня в 21:00?'], ['Д', 'green', 'danil', 'я за. сначала играем, потом болтаем'], ['Т', 'orange', 'ты', 'договорились 🤝']] }
};
function messageNode(letter, color, name, body) {
  const row = document.createElement('div'); row.className = 'message';
  const avatar = document.createElement('span'); avatar.className = `avatar avatar-${color}`; avatar.textContent = letter;
  const content = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = name;
  const time = document.createElement('time'); time.textContent = '20:43'; strong.append(time);
  const text = document.createElement('p'); text.textContent = body; content.append(strong, text); row.append(avatar, content); return row;
}
document.querySelectorAll('[data-channel]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-channel]').forEach(item => item.classList.toggle('active', item === button));
  const data = examples[button.dataset.channel]; channelTitle.textContent = data.title;
  chatContent.replaceChildren(); const intro = document.createElement('div'); intro.className = 'chat-start';
  const star = document.createElement('span'); star.textContent = '✳'; const heading = document.createElement('h2'); heading.textContent = data.heading;
  const description = document.createElement('p'); description.textContent = data.description; intro.append(star, heading, description);
  const divider = document.createElement('div'); divider.className = 'date-divider'; divider.textContent = 'СЕГОДНЯ'; chatContent.append(intro, divider);
  data.messages.forEach(args => chatContent.append(messageNode(...args)));
}));
document.querySelector('#demo-form').addEventListener('submit', event => {
  event.preventDefault(); const input = document.querySelector('#demo-message'); const value = input.value.trim(); if (!value) return;
  chatContent.append(messageNode('Т', 'orange', 'ты', value)); input.value = ''; chatContent.scrollTop = chatContent.scrollHeight;
});
document.querySelector('#reaction').addEventListener('click', event => {
  const button = event.currentTarget; const active = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', String(active)); button.querySelector('span').textContent = active ? '3' : '2';
});
let voiceConnected = true; let muted = false;
const voiceStatus = document.querySelector('#voice-status'); const muteToggle = document.querySelector('#mute-toggle');
document.querySelector('#voice-toggle').addEventListener('click', () => { voiceConnected = !voiceConnected; voiceStatus.textContent = voiceConnected ? (muted ? 'Микрофон выключен' : 'На связи') : 'Вне комнаты'; muteToggle.disabled = !voiceConnected; });
muteToggle.addEventListener('click', () => { muted = !muted; muteToggle.setAttribute('aria-pressed', String(muted)); muteToggle.setAttribute('aria-label', muted ? 'Включить микрофон' : 'Выключить микрофон'); muteToggle.textContent = muted ? '×' : '♩'; voiceStatus.textContent = muted ? 'Микрофон выключен' : 'На связи'; });

const downloadButton = document.querySelector('#download-button');
const downloadLabel = document.querySelector('#download-label');
const downloadStatus = document.querySelector('#download-status');
const progressArea = document.querySelector('#download-progress');
const progress = document.querySelector('#progress');
let downloadController;
document.querySelector('#cancel-download').addEventListener('click', () => downloadController?.abort());
downloadButton.addEventListener('click', async () => {
  if (downloadController) return;
  downloadController = new AbortController(); const signal = downloadController.signal;
  downloadButton.disabled = true; progress.value = 0; progressArea.hidden = false;
  downloadLabel.textContent = 'Загружаем…'; downloadStatus.textContent = 'Подготавливаем приложение…';
  try {
    const response = await fetch('./downloads/manifest.json', { signal }); if (!response.ok) throw new Error('Файл загрузки недоступен. Попробуй ещё раз позже.');
    const manifest = await response.json(); let received = 0; const buffers = [];
    for (const part of manifest.parts) {
      const partResponse = await fetch(`./downloads/${part}`, { signal }); if (!partResponse.ok || !partResponse.body) throw new Error('Не удалось загрузить приложение. Проверь соединение и повтори.');
      const reader = partResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffers.push(value); received += value.length; progress.value = Math.min(100, received / manifest.size * 100);
        downloadStatus.textContent = `${Math.floor(progress.value)}% · ${(received / 1048576).toFixed(1)} из ${(manifest.size / 1048576).toFixed(1)} МБ`;
      }
    }
    if (received !== manifest.size) throw new Error('Файл загрузился не полностью. Попробуй ещё раз.');
    signal.throwIfAborted(); downloadLabel.textContent = 'Проверяем файл…'; downloadStatus.textContent = 'Загрузка завершена. Проверяем целостность приложения…';
    const blob = new Blob(buffers, { type: 'application/octet-stream' });
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (hash !== manifest.sha256) throw new Error('Проверка файла не прошла. Скачай приложение ещё раз.');
    signal.throwIfAborted(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = manifest.filename; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    downloadStatus.textContent = 'Файл проверен и передан браузеру. Найди DuriChat-0.7.1-Windows.exe в загрузках и запусти.';
  } catch (error) {
    downloadStatus.textContent = signal.aborted ? 'Загрузка отменена. Можно начать снова.' : (error.message || 'Не удалось скачать файл. Попробуй ещё раз.');
  } finally {
    downloadController = null; downloadButton.disabled = false; downloadLabel.textContent = 'Скачать для Windows'; progressArea.hidden = true;
  }
});
