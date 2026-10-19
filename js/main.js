const authCallback = new URLSearchParams(location.hash.slice(1));
if (authCallback.has("invite_token") || authCallback.has("recovery_token")) {
  location.replace("/admin.html" + location.hash);
}
const $ = id => document.getElementById(id);
["nama1","nama2","nama3"].forEach(i => $(i).textContent = D.nama);
$("ortu").textContent = D.ortu;
$("tempat").textContent = D.tempat;
$("alamat").textContent = D.alamat;
$("maps").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(D.alamat);
$("acara").innerHTML = D.acara.map(a =>
  `<article class="hari">
    <div class="hari-tanggal">
      <span class="hari-bulan">${a.tanggal.split(" ")[1]}</span>
      <b>${a.tanggal.split(" ")[0]}</b>
    </div>
    <div class="hari-info">
      <span class="hari-label">Hari Acara</span>
      <b>${a.hari}, ${a.tanggal}</b>
      <span class="hari-waktu">${a.waktu}</span>
    </div>
    <span class="hari-ornamen" aria-hidden="true">✦</span>
  </article>`).join("");

const revealElements = document.querySelectorAll("#isi > section, #isi > footer, .hari, .cd > div");
revealElements.forEach((element, index) => {
  element.classList.add("reveal");
  element.style.setProperty("--reveal-delay", `${(index % 4) * 90}ms`);
});
document.body.classList.add("motion-ready");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  revealElements.forEach(element => revealObserver.observe(element));
} else {
  revealElements.forEach(element => element.classList.add("is-visible"));
}

const to = new URLSearchParams(location.search).get("to");
if (to) { $("tamu").textContent = to; $("tamuBox").hidden = false; $("n").value = to; }

const musicToggle = $("musicToggle");
const musicLabel = $("musicLabel");
const backgroundMusic = $("backgroundMusic");
let musicPlaying = false;
let musicStatus = "Musik undangan";

const updateMusicButton = () => {
  musicToggle.classList.toggle("is-playing", musicPlaying);
  musicToggle.setAttribute("aria-pressed", String(musicPlaying));
  musicToggle.setAttribute("aria-label", musicPlaying ? "Jeda musik latar" : "Putar musik latar");
  musicLabel.textContent = musicPlaying ? "Jeda musik" : musicStatus;
};

const startMusic = async () => {
  musicToggle.disabled = true;
  try {
    musicStatus = "Musik undangan";
    updateMusicButton();
    if (backgroundMusic.paused) await backgroundMusic.play();
    musicPlaying = true;
    updateMusicButton();
  } catch (error) {
    musicPlaying = false;
    if (error.name === "NotAllowedError") {
      musicStatus = "Ketuk untuk putar";
    } else {
      musicStatus = "Musik gagal dimuat";
      console.error("Gagal memutar assets/Khitanan.mp3:", error);
    }
    updateMusicButton();
  } finally {
    musicToggle.disabled = false;
  }
};

const stopMusic = () => {
  backgroundMusic.pause();
  musicPlaying = false;
  updateMusicButton();
};

musicToggle.addEventListener("click", () => {
  if (musicPlaying) stopMusic();
  else startMusic();
});

backgroundMusic.addEventListener("play", () => {
  musicPlaying = true;
  musicStatus = "Musik undangan";
  updateMusicButton();
});

backgroundMusic.addEventListener("pause", () => {
  musicPlaying = false;
  musicStatus = "Musik undangan";
  updateMusicButton();
});

backgroundMusic.addEventListener("error", () => {
  musicPlaying = false;
  musicStatus = "Musik gagal dimuat";
  updateMusicButton();
  console.error("File audio tidak dapat dimuat:", backgroundMusic.error);
});

startMusic();

$("buka").onclick = () => {
  document.body.classList.remove("locked");
  document.documentElement.style.overflow = "auto";
  document.body.style.overflow = "auto";
  requestAnimationFrame(() => {
    window.scrollTo({
      top: $("isi").getBoundingClientRect().top + window.scrollY,
      behavior: "smooth"
    });
  });
  if (!musicPlaying) startMusic();
};

const t = new Date(D.mulai).getTime();
const tick = () => {
  const s = Math.max(0, Math.floor((t - Date.now()) / 1000));
  [Math.floor(s/86400), Math.floor(s%86400/3600), Math.floor(s%3600/60), s%60]
    .forEach((v,i) => $("c"+i).textContent = v);
};
tick(); setInterval(tick, 1000);

$("kalender").href = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=" + encodeURIComponent("Khitanan " + D.nama) +
  "&dates=20261025T010000Z/20261025T020000Z" +
  "&location=" + encodeURIComponent(D.alamat);

$("salin").onclick = async e => {
  try { await navigator.clipboard.writeText(D.alamat); e.target.textContent = "Alamat tersalin"; }
  catch { e.target.textContent = "Salin manual dari teks"; }
};

const guestbookList = $("guestbookList");
let lastEntryId = null;
let submissionId = crypto.randomUUID();
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
});

function renderEntry(entry, prepend = false) {
  if (document.getElementById(`confirmation-${entry.id}`)) return;
  const article = document.createElement("article");
  article.className = "guest-entry";
  article.id = `confirmation-${entry.id}`;
  const avatar = document.createElement("span");
  avatar.className = "guest-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = entry.name.slice(0, 1).toLocaleUpperCase("id-ID");
  const content = document.createElement("div");
  content.className = "guest-content";
  const header = document.createElement("div");
  header.className = "guest-header";
  const name = document.createElement("b");
  name.textContent = entry.name;
  const badge = document.createElement("span");
  badge.className = `attendance-badge ${entry.attendance === "hadir" ? "attending" : "absent"}`;
  badge.textContent = entry.attendance === "hadir" ? "Hadir" : "Tidak Hadir";
  header.append(name, badge);
  const time = document.createElement("time");
  time.dateTime = entry.createdAt;
  time.textContent = `${dateFormatter.format(new Date(entry.createdAt))} WIB`;
  content.append(header, time);
  if (entry.message) {
    const message = document.createElement("p");
    message.textContent = entry.message;
    content.append(message);
  }
  if (entry.canDelete) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "delete-entry";
    removeButton.textContent = "Hapus";
    removeButton.setAttribute("aria-label", `Hapus kiriman ${entry.name}`);
    removeButton.addEventListener("click", async () => {
      if (!confirm(`Hapus konfirmasi dan ucapan dari ${entry.name}? Tindakan ini tidak dapat dibatalkan.`)) return;
      removeButton.disabled = true;
      removeButton.textContent = "Menghapus...";
      try {
        const response = await fetch(`/api/rsvp?id=${entry.id}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Kiriman gagal dihapus.");
        }
        article.remove();
        $("rsvpStatus").textContent = "Konfirmasi dan ucapan berhasil dihapus.";
        if (!guestbookList.childElementCount) {
          if (!$("loadMore").hidden) await loadEntries();
          else $("guestbookStatus").textContent = "Belum ada ucapan. Jadilah yang pertama mengirim doa untuk Abizar.";
        }
      } catch (error) {
        $("rsvpStatus").textContent = error.message || "Penghapusan gagal. Silakan coba lagi.";
        removeButton.disabled = false;
        removeButton.textContent = "Hapus";
      }
    });
    content.append(removeButton);
  }
  article.append(avatar, content);
  if (prepend) guestbookList.prepend(article);
  else guestbookList.append(article);
}

async function loadEntries() {
  const button = $("loadMore");
  button.disabled = true;
  $("guestbookStatus").textContent = "Memuat ucapan...";
  try {
    const response = await fetch(`/api/rsvp${lastEntryId ? `?before=${lastEntryId}` : ""}`);
    if (!response.ok) throw new Error();
    const data = await response.json();
    data.entries.forEach(entry => renderEntry(entry));
    if (data.entries.length) lastEntryId = data.entries[data.entries.length - 1].id;
    button.hidden = !data.hasMore;
    button.textContent = "Lihat ucapan lainnya";
    $("guestbookStatus").textContent = guestbookList.childElementCount ? "" : "Belum ada ucapan. Jadilah yang pertama mengirim doa untuk Abizar.";
  } catch {
    $("guestbookStatus").textContent = "Ucapan belum dapat dimuat. Silakan coba lagi.";
    button.hidden = false;
    button.textContent = "Coba lagi";
  } finally {
    button.disabled = false;
  }
}
$("loadMore").addEventListener("click", loadEntries);
$("p").addEventListener("input", () => {
  $("messageCount").textContent = `${$("p").value.length}/500`;
});

$("rsvp").addEventListener("submit", async e => {
  e.preventDefault();
  const button = $("rsvpSubmit");
  if (button.disabled) return;
  if (!$("n").value.trim()) {
    $("rsvpStatus").textContent = "Mohon isi nama Anda.";
    $("n").focus();
    return;
  }
  button.disabled = true;
  button.textContent = "Mengirim...";
  $("rsvpStatus").textContent = "";
  try {
    const response = await fetch("/api/rsvp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, name: $("n").value.trim(),
        attendance: $("h").value, message: $("p").value.trim() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Konfirmasi gagal dikirim. Silakan coba lagi.");
    if (data.entry.canDelete) $("ownerNote").hidden = false;
    renderEntry(data.entry, true);
    if (!lastEntryId) lastEntryId = data.entry.id;
    $("guestbookStatus").textContent = "";
    $("rsvpStatus").textContent = "Terima kasih! Konfirmasi dan ucapan Anda sudah tersimpan.";
    $("p").value = "";
    $("messageCount").textContent = "0/500";
    submissionId = crypto.randomUUID();
  } catch (error) {
    $("rsvpStatus").textContent = error instanceof TypeError
      ? "Koneksi bermasalah. Silakan coba kirim kembali." : error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Kirim Konfirmasi";
  }
});
loadEntries();
