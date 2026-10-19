UNDANGAN KHITANAN - Abizar Adriana Yusuf

Website undangan dengan konfirmasi kehadiran dan ucapan langsung di halaman.

Deploy melalui Netlify dari repositori agar dependensi, Functions, dan migrasi database diproses. Unggahan statis saja tidak menjalankan fitur konfirmasi.

Konfirmasi tersimpan di Netlify Database. Nama, status kehadiran, ucapan, dan waktu kiriman ditampilkan kepada tamu di bawah formulir. Daftar menampilkan 20 kiriman per halaman dengan tombol untuk memuat kiriman sebelumnya.

- Pastikan file musik tersedia pada assets/Khitanan.mp3.
- Jika musik tidak mulai otomatis, tamu dapat menekan tombol musik.
- Alamat dan jadwal dapat diubah di js/data.js.
- Link personal untuk nama tamu: https://alamatmu/?to=Bapak+Budi
- Uji pengiriman konfirmasi, pemuatan ulang daftar ucapan, musik, Google Maps, dan kalender pada deploy preview.

PENGHAPUSAN KONFIRMASI

Pengirim dapat menghapus kiriman baru dari browser yang sama selama cookie situs masih tersedia (maksimal satu tahun). Tombol Hapus meminta konfirmasi sebelum menghapus konfirmasi beserta ucapannya secara permanen. Kiriman yang dibuat sebelum fitur ini tersedia hanya dapat dihapus admin karena belum memiliki penanda pengirim.

Admin mengelola semua kiriman melalui /admin.html atau tautan Kelola konfirmasi di bagian bawah undangan. Akses memakai Netlify Identity dan hanya menerima akun dengan peran admin. Untuk menyiapkan admin pertama, buka Identity pada dashboard proyek Netlify, undang email pemilik melalui Invite users, lalu tambahkan peran admin pada detail pengguna dan simpan. Tautan undangan membuka formulir pembuatan kata sandi. Jangan membagikan akses akun admin kepada tamu.

Pemeriksaan penghapusan: node --test tests/rsvp-delete.test.mjs
