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

$("rsvp").addEventListener("submit", e => {
  e.preventDefault();
  const msg = `Assalamu'alaikum, saya ${$("n").value}.\nKonfirmasi kehadiran: ${$("h").value}.\n` +
              ($("p").value ? `Ucapan: ${$("p").value}` : "");
  window.open(`https://wa.me/${D.wa}?text=${encodeURIComponent(msg)}`, "_blank");
});
