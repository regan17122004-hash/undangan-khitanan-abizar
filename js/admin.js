const el = id => document.getElementById(id);
const callback = new URLSearchParams(location.hash.slice(1));
let callbackToken = callback.get("invite_token") || callback.get("recovery_token");
let action = callback.has("invite_token") ? "invite" : callback.has("recovery_token") ? "reset" : "login";
if (callbackToken) history.replaceState(null, "", location.pathname);
let cursor = null;

async function api(body) {
  const response = await fetch("/api/admin-session", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
function showLogin() {
  el("adminLogin").hidden = false;
  el("adminEmail").required = action === "login";
  el("adminEmail").hidden = action !== "login";
  document.querySelector('label[for="adminEmail"]').hidden = action !== "login";
  el("recoverPassword").hidden = action !== "login";
  el("adminPassword").autocomplete = action === "login" ? "current-password" : "new-password";
  el("adminPassword").minLength = action === "login" ? 1 : 8;
  el("adminSubmit").textContent = action === "login" ? "Masuk" : "Simpan kata sandi";
}
async function checkSession() {
  try {
    const response = await fetch("/api/admin-session");
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data.isAdmin) {
      el("adminLogin").hidden = true;
      el("adminLogout").hidden = false;
      el("adminEntries").hidden = false;
      el("adminStatus").textContent = "Anda masuk sebagai admin.";
      await loadAdminEntries();
    } else {
      showLogin();
      el("adminStatus").textContent = callbackToken ? "Buat kata sandi untuk melanjutkan." : "Masuk dengan akun yang memiliki peran admin.";
    }
  } catch {
    el("adminStatus").textContent = "Akses admin belum dapat dimuat. Silakan muat ulang halaman.";
    showLogin();
  }
}
async function loadAdminEntries() {
  el("adminMore").disabled = true;
  try {
    const response = await fetch(`/api/rsvp${cursor ? `?before=${cursor}` : ""}`);
    if (!response.ok) throw new Error("Daftar belum dapat dimuat.");
    const data = await response.json();
    if (!data.isAdmin) { location.reload(); return; }
    for (const entry of data.entries) {
      const row = document.createElement("article");
      row.className = "admin-entry";
      const name = document.createElement("b");
      name.textContent = entry.name;
      const status = document.createElement("span");
      status.className = `attendance-badge ${entry.attendance === "hadir" ? "attending" : "absent"}`;
      status.textContent = entry.attendance === "hadir" ? "Hadir" : "Tidak Hadir";
      const time = document.createElement("time");
      time.textContent = new Date(entry.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
      const message = document.createElement("p");
      message.textContent = entry.message;
      const button = document.createElement("button");
      button.className = "delete-entry";
      button.type = "button";
      button.textContent = "Hapus";
      button.setAttribute("aria-label", `Hapus kiriman ${entry.name}`);
      button.onclick = async () => {
        if (!confirm(`Hapus konfirmasi dan ucapan dari ${entry.name}? Tindakan ini tidak dapat dibatalkan.`)) return;
        button.disabled = true;
        button.textContent = "Menghapus...";
        try {
          const result = await fetch(`/api/rsvp?id=${entry.id}`, { method: "DELETE" });
          if (!result.ok) {
            const error = await result.json();
            throw new Error(error.error);
          }
          row.remove();
          el("adminStatus").textContent = "Kiriman berhasil dihapus.";
          if (!el("adminList").childElementCount && !el("adminMore").hidden) await loadAdminEntries();
          else if (!el("adminList").childElementCount) el("adminStatus").textContent = "Tidak ada kiriman.";
        } catch (error) {
          el("adminStatus").textContent = error.message || "Penghapusan gagal. Coba lagi.";
          button.disabled = false;
          button.textContent = "Hapus";
        }
      };
      row.append(name, status, time, message, button);
      el("adminList").append(row);
    }
    if (data.entries.length) cursor = data.entries.at(-1).id;
    el("adminMore").hidden = !data.hasMore;
    el("adminMore").textContent = "Lihat lainnya";
    if (!el("adminList").childElementCount) el("adminStatus").textContent = "Belum ada kiriman.";
  } catch (error) {
    el("adminStatus").textContent = error.message || "Daftar belum dapat dimuat.";
    el("adminMore").hidden = false;
    el("adminMore").textContent = "Coba lagi";
  } finally { el("adminMore").disabled = false; }
}
el("adminLogin").onsubmit = async event => {
  event.preventDefault();
  el("adminSubmit").disabled = true;
  try {
    await api({ action, email: el("adminEmail").value, password: el("adminPassword").value, token: callbackToken });
    location.reload();
  } catch (error) { el("adminStatus").textContent = error.message || "Tidak dapat masuk."; }
  finally { el("adminPassword").value = ""; el("adminSubmit").disabled = false; }
};
el("adminLogout").onclick = async () => {
  el("adminLogout").disabled = true;
  try { await api({ action: "logout" }); location.reload(); }
  catch { el("adminStatus").textContent = "Gagal keluar. Coba lagi."; el("adminLogout").disabled = false; }
};
el("recoverPassword").onclick = async () => {
  if (!el("adminEmail").reportValidity() || !el("adminEmail").value) return;
  el("recoverPassword").disabled = true;
  try {
    await api({ action: "recovery", email: el("adminEmail").value });
    el("adminStatus").textContent = "Jika email terdaftar, tautan pemulihan dikirim ke kotak masuk Anda.";
  } catch { el("adminStatus").textContent = "Pemulihan belum dapat diproses. Coba lagi."; }
  finally { el("recoverPassword").disabled = false; }
};
el("adminMore").onclick = loadAdminEntries;
checkSession();
