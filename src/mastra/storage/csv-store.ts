import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export type Tab = "Akun" | "Issue" | "Blokir";
type Baris = Record<string, string>;

const KOLOM: Record<Tab, string[]> = {
  Akun: ["id_akun", "nama", "no_hp", "status", "dibuat_pada"],
  Issue: ["id_tiket", "nama_pelapor", "no_hp", "ringkasan", "kategori", "status", "dibuat_pada"],
  Blokir: ["id_permintaan", "id_akun", "nama", "alasan", "status_proses", "waktu"],
};

const folder = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const lokasi = (tab: Tab) => path.join(folder, `${tab}.csv`);

function pastikanAda(tab: Tab) {
  fs.mkdirSync(folder, { recursive: true });
  if (!fs.existsSync(lokasi(tab))) {
    fs.writeFileSync(lokasi(tab), KOLOM[tab].join(",") + "\n");
  }
}

function simpan(tab: Tab, baris: Baris[]) {
  fs.writeFileSync(lokasi(tab), Papa.unparse({ fields: KOLOM[tab], data: baris }) + "\n");
}

export function bacaSemua(tab: Tab): Baris[] {
  pastikanAda(tab);
  const teks = fs.readFileSync(lokasi(tab), "utf8");
  return Papa.parse<Baris>(teks, { header: true, skipEmptyLines: true }).data;
}

export function tambahBaris(tab: Tab, baris: Baris) {
  const semua = bacaSemua(tab);
  semua.push(baris);
  simpan(tab, semua);
}

// Cari baris berdasarkan satu kolom, lalu ubah isinya. Return false kalau tidak ketemu.
export function ubahBaris(tab: Tab, kolomKunci: string, nilai: string, perubahan: Baris) {
  const semua = bacaSemua(tab);
  const idx = semua.findIndex((b) => b[kolomKunci] === nilai);
  if (idx === -1) return false;
  semua[idx] = { ...semua[idx], ...perubahan };
  simpan(tab, semua);
  return true;
}

export function buatId(awalan: string) {
  return `${awalan}-${Date.now().toString(36).toUpperCase()}`;
}