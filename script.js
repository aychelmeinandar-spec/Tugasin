const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const titles={chat:['Asisten Tugas','ASISTEN TUGAS'],planner:['Rencana Tugas','RENCANA TUGAS'],learn:['Belajar & Kuis','BELAJAR & KUIS'],docs:['Dokumen Saya','DOKUMEN SAYA'],history:['Riwayat Percakapan','RIWAYAT']};
let chats=JSON.parse(localStorage.getItem('tugasinProChats')||'[]'),docs=JSON.parse(localStorage.getItem('tugasinProDocs')||'[]');
let conversation=[]; let sending=false;
function toast(msg){let t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
function showView(name){$$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+name));$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===name));$('#pageTitle').textContent=titles[name][0];$('#crumb').textContent=titles[name][1];$('#sidebar').classList.remove('open');if(name==='history')renderHistory();if(name==='docs')renderDocs();window.scrollTo(0,0)}
$$('.nav').forEach(n=>n.addEventListener('click',()=>showView(n.dataset.view)));$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');$('#settingsBtn').onclick=()=>toast('Chat AI memakai backend lokal. API key disimpan di .env.');$('#newTask').onclick=()=>{ conversation=[]; $('#messages').innerHTML='';addMessage('assistant','Hai! Kita mulai dari awal. Ceritakan mata kuliah, instruksi tugas, dan hasil yang diminta dosen.');showView('chat')};
function addMessage(role,text){let row=document.createElement('div');row.className='message '+role;let av=document.createElement('div');av.className='message-avatar';av.textContent=role==='assistant'?'T':'AS';let bubble=document.createElement('div');bubble.className='bubble';bubble.innerHTML=text;if(role==='user'){row.append(bubble,av)}else{row.append(av,bubble)}$('#messages').append(row);$('#messages').scrollTop=$('#messages').scrollHeight}
function esc(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  
function renderMarkdown(text) {
  const lines = esc(String(text || ''))
    .replace(/\r\n/g, '\n')
    .split('\n');

  const html = [];
  let paragraph = [];
  let listType = null;

  
function formatInline(value) {
  return value
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>');
}

  function flushParagraph() {
    if (paragraph.length) {
      html.push('<p>' + formatInline(paragraph.join('<br>')) + '</p>');
      paragraph = [];
    }
  }

  function closeList() {
    if (listType) {
      html.push(listType === 'ul' ? '</ul>' : '</ol>');
      listType = null;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();

      const level = heading[1].length;
      html.push(
        `<h${level}>${formatInline(heading[2])}</h${level}>`
      );
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push('<hr>');
      continue;
    }

    const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (bullet || numbered) {
      flushParagraph();

      const nextType = bullet ? 'ul' : 'ol';
      if (listType !== nextType) {
        closeList();
        html.push(nextType === 'ul' ? '<ul>' : '<ol>');
        listType = nextType;
      }

      const content = bullet ? bullet[1] : numbered[1];
      html.push('<li>' + formatInline(content) + '</li>');
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  return html.join('');
}


function setSending(value){sending=value;const btn=$('.send-btn');btn.disabled=value;btn.innerHTML=value?'Memproses…':'Kirim <span>➤</span>';$('#prompt').disabled=value;}
async function sendPrompt(q){
  q=q.trim();if(!q||sending)return;
  showView('chat');addMessage('user',esc(q));$('#prompt').value='';
  conversation.push({role:'user',content:q});setSending(true);
  const loading=document.createElement('div');loading.className='message assistant';loading.innerHTML='<div class="message-avatar">T</div><div class="bubble">Sedang menyusun jawaban…</div>';$('#messages').append(loading);$('#messages').scrollTop=$('#messages').scrollHeight;
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:conversation.slice(-12)})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Permintaan gagal.');
    const answer=String(data.answer||'AI belum memberikan jawaban.');conversation.push({role:'assistant',content:answer});
    loading.remove();addMessage('assistant',renderMarkdown(answer));saveChat(q,renderMarkdown(answer));
  }catch(err){
    conversation.pop();loading.remove();
    const msg=err instanceof TypeError?'Tidak dapat terhubung ke backend. Pastikan server dijalankan dengan perintah npm start dan buka http://localhost:3000.':err.message;
    addMessage('assistant','<p>'+esc(msg)+'</p><div class="notice">Jika baru mengatur .env, hentikan server lalu jalankan kembali.</div>');
  }finally{setSending(false);$('#prompt').focus();}
}
function saveChat(q,a){chats.unshift({q,a,date:new Date().toLocaleString('id-ID')});chats=chats.slice(0,40);localStorage.setItem('tugasinProChats',JSON.stringify(chats))}
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();sendPrompt($('#prompt').value)});$('#prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#chatForm').requestSubmit()}});$$('[data-prompt]').forEach(b=>b.onclick=()=>sendPrompt(b.dataset.prompt));
$('#makePlan').onclick=()=>{let topic=$('#planTopic').value.trim(),course=$('#planCourse').value.trim(),days=Number($('#planDays').value),extra=$('#planExtra').value.trim();if(!topic){toast('Isi topik tugas terlebih dahulu.');return}let stages=['Baca instruksi dan tulis kriteria tugas','Cari referensi tepercaya dan catat poin penting','Susun kerangka dan mulai draf','Lengkapi isi atau hasil utama','Periksa isi, sitasi, dan format akhir','Minta umpan balik dan revisi','Finalisasi serta siapkan pengumpulan'];let list='';for(let i=0;i<days;i++){let idx=Math.min(stages.length-1,Math.floor(i*stages.length/days));list+=`<li><b>Hari ${i+1}:</b> ${stages[idx]}.</li>`}$('#planResult').innerHTML=`<div class="result-card"><h3>Rencana: ${esc(topic)}</h3><p><b>Mata kuliah:</b> ${esc(course||'Belum ditentukan')} · <b>Durasi:</b> ${days} hari</p><ol>${list}</ol>${extra?`<p><b>Catatan instruksi:</b> ${esc(extra)}</p>`:''}<div class="notice">Jadwal ini adalah template. Sesuaikan dengan tenggat, beban tugas, dan ketentuan dosen.</div></div>`};
$('#learnBtn').onclick=()=>{let t=$('#learnTopic').value.trim(),m=$('#learnMode').value;if(!t){toast('Isi topik yang ingin dipelajari.');return}let content=m==='quiz'?`<h4>Latihan mandiri tentang ${esc(t)}</h4><ol><li>Jelaskan konsep ${esc(t)} dengan bahasamu sendiri.</li><li>Apa tujuan atau masalah yang diselesaikan oleh konsep tersebut?</li><li>Sebutkan dua komponen atau tahapan utamanya.</li><li>Berikan contoh penerapan dalam situasi nyata.</li><li>Apa keterbatasan atau kesalahan umum saat menggunakannya?</li></ol><p>Coba jawab dulu tanpa melihat catatan, lalu periksa dengan bahan kuliah.</p>`:m==='example'?`<h4>Cara mencari contoh penerapan</h4><ol><li>Tentukan masalah nyata yang berkaitan dengan ${esc(t)}.</li><li>Identifikasi data atau komponen yang dibutuhkan.</li><li>Jelaskan bagaimana konsep ini digunakan untuk menyelesaikan masalah.</li><li>Uraikan hasil yang diharapkan dan keterbatasannya.</li></ol><p>Kalau kamu kirim materi kuliah terkait, contoh dapat dibuat lebih spesifik.</p>`:`<h4>Mulai memahami ${esc(t)}</h4><ol><li><b>Definisi:</b> tulis pengertian inti dalam satu atau dua kalimat berdasarkan materi kuliah.</li><li><b>Tujuan:</b> pahami masalah apa yang diselesaikan.</li><li><b>Cara kerja:</b> catat prosesnya berurutan.</li><li><b>Contoh:</b> hubungkan dengan kasus sederhana.</li><li><b>Uji pemahaman:</b> coba jelaskan ulang tanpa menyalin teks.</li></ol><p>Ini adalah kerangka belajar umum, bukan penjelasan faktual lengkap tentang topik. Tambahkan slide atau catatan kuliah agar bisa dibahas secara tepat.</p>`;$('#learnResult').innerHTML=`<div class="result-card"><h3>${m==='quiz'?'Kuis':m==='example'?'Contoh penerapan':'Panduan belajar'}: ${esc(t)}</h3>${content}<div class="notice">Untuk menghindari informasi yang keliru, cocokkan penjelasan dengan modul atau sumber tepercaya.</div></div>`};
$('#docInput').addEventListener('change',e=>{[...e.target.files].forEach(f=>docs.push({name:f.name,size:f.size}));localStorage.setItem('tugasinProDocs',JSON.stringify(docs));renderDocs();e.target.value='';toast('Nama dokumen ditambahkan.')});function renderDocs(){let el=$('#docList');if(!docs.length){el.innerHTML='<div class="empty-state">Belum ada dokumen yang ditambahkan.</div>';return}el.innerHTML=docs.map((d,i)=>`<div class="doc-item"><div class="doc-icon">FILE</div><div><b>${esc(d.name)}</b><small>${(d.size/1024).toFixed(1)} KB · isi belum dibaca</small></div><button class="remove-btn" data-remove="${i}">Hapus</button></div>`).join('');$$('[data-remove]').forEach(b=>b.onclick=()=>{docs.splice(Number(b.dataset.remove),1);localStorage.setItem('tugasinProDocs',JSON.stringify(docs));renderDocs()})}
function renderHistory(){let el=$('#historyList');if(!chats.length){el.innerHTML='<div class="empty-state">Belum ada riwayat percakapan. Mulai chat dari menu Asisten Tugas.</div>';return}el.innerHTML=chats.map((c,i)=>`<div class="history-item" data-chat="${i}"><div class="suggestion-icon purple">◷</div><div><b>${esc(c.q.slice(0,90))}${c.q.length>90?'…':''}</b><small>${esc(c.date)}</small></div><span class="arrow">↗</span></div>`).join('');$$('[data-chat]').forEach(b=>b.onclick=()=>{let c=chats[Number(b.dataset.chat)];showView('chat');conversation=[{role:'user',content:c.q},{role:'assistant',content:c.a.replace(/<[^>]*>/g,' ')}];addMessage('user',esc(c.q));addMessage('assistant',c.a)})}$('#clearHistory').onclick=()=>{if(confirm('Hapus semua riwayat percakapan lokal?')){chats=[];localStorage.removeItem('tugasinProChats');renderHistory();toast('Riwayat dihapus.')}};
