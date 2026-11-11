(async function () {
  const data = await fetch('data.json').then(r => r.json());
  const base = data.downloadBase; // ex: https://github.com/USER/REPO/releases/download/originais/
  const clips = data.clips;

  const fmtDur = s => { s = Math.round(s); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };
  const fmtSize = b => b >= 1e9 ? (b / 1e9).toFixed(1).replace('.', ',') + ' GB' : Math.round(b / 1e6) + ' MB';
  const hora = f => { const m = f.match(/_\d{4}(\d{2})(\d{2})_C/); return m ? m[1] + 'h' + m[2] : ''; };

  const total = clips.reduce((a, c) => a + c.size, 0);
  const dur = clips.reduce((a, c) => a + c.dur, 0);
  document.getElementById('stats').textContent =
    clips.length + ' vídeos · ' + Math.round(dur / 60) + ' minutos · ' + fmtSize(total) + ' em 4K';

  // agrupar por seção e subseção
  const sections = [];
  const byKey = {};
  clips.forEach((c, i) => {
    c.index = i;
    const [sec, sub] = c.folder.split('/');
    if (!byKey[sec]) { byKey[sec] = { key: sec, subs: [], subMap: {} }; sections.push(byKey[sec]); }
    const S = byKey[sec];
    const sk = sub || '';
    if (!S.subMap[sk]) { S.subMap[sk] = { key: sk, clips: [] }; S.subs.push(S.subMap[sk]); }
    S.subMap[sk].clips.push(c);
  });

  const label = k => (data.labels[k] || k.replace(/^\d+_/, '').replace(/_/g, ' '));
  const num = k => (k.match(/^(\d+)_/) || [])[1] || '';

  const chips = document.getElementById('chips');
  const gallery = document.getElementById('gallery');

  sections.forEach(S => {
    const id = 's-' + S.key;
    const n = S.subs.reduce((a, s) => a + s.clips.length, 0);
    const a = document.createElement('a'); a.href = '#' + id; a.textContent = label(S.key); chips.appendChild(a);

    const sec = document.createElement('section'); sec.className = 'section'; sec.id = id;
    sec.innerHTML = '<div class="sectionHead"><h2><span>' + num(S.key) + '</span>' + label(S.key) + '</h2><p class="count">' + n + ' vídeos</p></div>';
    S.subs.forEach(sub => {
      if (sub.key) {
        const h = document.createElement('h3'); h.className = 'sub';
        h.innerHTML = label(sub.key) + '<small>' + sub.clips.length + '</small>'; sec.appendChild(h);
      }
      const g = document.createElement('div'); g.className = 'grid';
      sub.clips.forEach(c => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'card';
        b.setAttribute('aria-label', 'Assistir ' + c.id + ' · ' + hora(c.file));
        b.innerHTML = '<img loading="lazy" decoding="async" alt="" src="t/' + c.id + '.jpg"><span class="play"></span>' +
          '<span class="meta"><b>' + c.id + ' · ' + hora(c.file) + '</b><i>' + fmtDur(c.dur) + '</i></span>';
        const img = b.querySelector('img'); img.onload = () => img.classList.add('ok');
        b.onclick = () => open(c.index);
        g.appendChild(b);
      });
      sec.appendChild(g);
    });
    gallery.appendChild(sec);
  });

  // destacar chip ativo
  const links = [...chips.querySelectorAll('a')];
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.hash === '#' + e.target.id));
  }), { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('.section').forEach(s => io.observe(s));

  // player
  const dlg = document.getElementById('player'), video = document.getElementById('video');
  const pTitle = document.getElementById('pTitle'), pMeta = document.getElementById('pMeta'), dl = document.getElementById('dl');
  let cur = -1;
  function open(i) {
    cur = (i + clips.length) % clips.length;
    const c = clips[cur];
    video.src = 'v/' + c.id + '.mp4';
    video.poster = 't/' + c.id + '.jpg';
    pTitle.textContent = c.id + ' · ' + hora(c.file);
    const [sec, sub] = c.folder.split('/');
    pMeta.textContent = label(sec) + (sub ? ' · ' + label(sub) : '') + ' · ' + fmtDur(c.dur);
    dl.href = base + encodeURIComponent(c.file);
    dl.textContent = 'Baixar original · ' + fmtSize(c.size);
    if (!dlg.open) dlg.showModal();
    video.play().catch(() => {});
  }
  function close() { video.pause(); video.removeAttribute('src'); video.load(); dlg.close(); }
  document.getElementById('close').onclick = close;
  document.getElementById('prev').onclick = () => open(cur - 1);
  document.getElementById('next').onclick = () => open(cur + 1);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.classList.contains('playerBox')) close(); });
  document.addEventListener('keydown', e => {
    if (!dlg.open) return;
    if (e.key === 'ArrowRight') open(cur + 1);
    if (e.key === 'ArrowLeft') open(cur - 1);
  });
})();
