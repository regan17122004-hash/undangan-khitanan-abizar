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

Semua pengunjung dapat menghapus konfirmasi, ucapan, dan doa dari daftar tanpa login, termasuk kiriman lama. Tombol Hapus meminta konfirmasi sebelum menghapus kiriman secara permanen. Daftar diperbarui setelah penghapusan berhasil.

Pemeriksaan penghapusan: node --test tests/rsvp-delete.test.mjs
