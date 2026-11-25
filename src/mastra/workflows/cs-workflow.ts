import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { agenKlasifikasi } from "../agents/agen-klasifikasi";
import { klasifikasiSchema } from "../schemas/layanan";
import { bacaSemua, tambahBaris, ubahBaris, buatId } from "../storage/csv-store";

const hasilKlasifikasi = klasifikasiSchema.extend({ pesan: z.string() });
type Klasifikasi = z.infer<typeof hasilKlasifikasi>;
const hasilLayanan = z.object({ balasan: z.string() });

const AMBANG_KEYAKINAN = 0.6;
const sekarang = () => new Date().toISOString();

const NAMA_FIELD = {
  nama: "nama lengkap",
  noHp: "nomor HP",
  ringkasanMasalah: "penjelasan masalah",
} as const;
type Wajib = keyof typeof NAMA_FIELD;

function cekKurang(data: Klasifikasi["data"], wajib: Wajib[]) {
  return wajib.filter((k) => !data[k]).map((k) => NAMA_FIELD[k]);
}

// Syarat umum: masuk salah satu dari 3 layanan dan LLM cukup yakin
const bisaDiproses = (d: Klasifikasi) =>
  d.layanan !== "di_luar_layanan" && d.keyakinan >= AMBANG_KEYAKINAN;

// --- Step 1: klasifikasi ---
const klasifikasi = createStep({
  id: "klasifikasi",
  inputSchema: z.object({ pesan: z.string() }),
  outputSchema: hasilKlasifikasi,
  execute: async ({ inputData }) => {
    const respons = await agenKlasifikasi.generate(inputData.pesan, {
      structuredOutput: { schema: klasifikasiSchema },
    });
    return { ...respons.object, pesan: inputData.pesan };
  },
});

// --- Cabang A: terima issue ---
const terimaIssue = createStep({
  id: "terimaIssue",
  inputSchema: hasilKlasifikasi,
  outputSchema: hasilLayanan,
  execute: async ({ inputData }) => {
    const { nama, noHp, ringkasanMasalah, kategori } = inputData.data;
    const kurang = cekKurang(inputData.data, ["nama", "noHp", "ringkasanMasalah"]);
    if (kurang.length > 0) {
      return { balasan: `Mohon lengkapi data berikut: ${kurang.join(", ")}.` };
    }
    const id = buatId("TKT");
    tambahBaris("Issue", {
      id_tiket: id,
      nama_pelapor: nama!,
      no_hp: noHp!,
      ringkasan: ringkasanMasalah!,
      kategori: kategori ?? "lainnya",
      status: "baru",
      dibuat_pada: sekarang(),
    });
    return { balasan: `Terima kasih ${nama}, laporan Anda sudah tercatat dengan nomor tiket ${id}.` };
  },
});

// --- Cabang B: buka rekening baru ---
const bukaRekening = createStep({
  id: "bukaRekening",
  inputSchema: hasilKlasifikasi,
  outputSchema: hasilLayanan,
  execute: async ({ inputData }) => {
    const { nama, noHp } = inputData.data;
    const kurang = cekKurang(inputData.data, ["nama", "noHp"]);
    if (kurang.length > 0) {
      return { balasan: `Mohon lengkapi data berikut: ${kurang.join(", ")}.` };
    }
    if (bacaSemua("Akun").some((a) => a.no_hp === noHp)) {
      return { balasan: "Nomor HP ini sudah terdaftar sebagai pemilik rekening." };
    }
    const id = buatId("AKN");
    tambahBaris("Akun", {
      id_akun: id,
      nama: nama!,
      no_hp: noHp!,
      status: "aktif",
      dibuat_pada: sekarang(),
    });
    return { balasan: `Rekening atas nama ${nama} berhasil dibuat dengan ID ${id}.` };
  },
});

// --- Cabang C: buka blokir ---
const bukaBlokir = createStep({
  id: "bukaBlokir",
  inputSchema: hasilKlasifikasi,
  outputSchema: hasilLayanan,
  execute: async ({ inputData }) => {
    const { nama, noHp, ringkasanMasalah } = inputData.data;
    const kurang = cekKurang(inputData.data, ["nama", "noHp"]);
    if (kurang.length > 0) {
      return { balasan: `Mohon lengkapi data berikut: ${kurang.join(", ")}.` };
    }
    const akun = bacaSemua("Akun").find((a) => a.no_hp === noHp);
    if (!akun) return { balasan: "Akun dengan nomor HP tersebut tidak ditemukan." };
    if (akun.nama.toLowerCase() !== nama!.toLowerCase()) {
      return { balasan: "Nama tidak cocok dengan data akun, verifikasi gagal." };
    }
    if (akun.status !== "diblokir") {
      return { balasan: "Akun Anda sedang tidak dalam kondisi diblokir." };
    }
    ubahBaris("Akun", "id_akun", akun.id_akun, { status: "aktif" });
    tambahBaris("Blokir", {
      id_permintaan: buatId("BLK"),
      id_akun: akun.id_akun,
      nama: akun.nama,
      alasan: ringkasanMasalah ?? "-",
      status_proses: "disetujui",
      waktu: sekarang(),
    });
    return { balasan: `Blokir akun ${akun.id_akun} atas nama ${akun.nama} sudah dibuka.` };
  },
});

// --- Cabang D: di luar layanan / LLM kurang yakin ---
const diLuarLayanan = createStep({
  id: "diLuarLayanan",
  inputSchema: hasilKlasifikasi,
  outputSchema: hasilLayanan,
  execute: async () => ({
    balasan:
      "Maaf, saya hanya bisa membantu tiga hal: menerima laporan masalah, membuka rekening baru, atau membuka blokir akun. Bisa dijelaskan lagi kebutuhan Anda?",
  }),
});

// --- Step akhir: ambil hasil dari cabang yang jalan ---
const rapikan = createStep({
  id: "rapikan",
  inputSchema: z.object({
    terimaIssue: hasilLayanan.optional(),
    bukaRekening: hasilLayanan.optional(),
    bukaBlokir: hasilLayanan.optional(),
    diLuarLayanan: hasilLayanan.optional(),
  }),
  outputSchema: hasilLayanan,
  execute: async ({ inputData }) => {
    return (
      inputData.terimaIssue ??
      inputData.bukaRekening ??
      inputData.bukaBlokir ??
      inputData.diLuarLayanan ?? { balasan: "Maaf, terjadi kendala. Silakan coba lagi." }
    );
  },
});

export const csWorkflow = createWorkflow({
  id: "cs-workflow",
  inputSchema: z.object({ pesan: z.string() }),
  outputSchema: hasilLayanan,
})
  .then(klasifikasi)
  .branch([
    [async ({ inputData }) => bisaDiproses(inputData) && inputData.layanan === "terima_issue", terimaIssue],
    [async ({ inputData }) => bisaDiproses(inputData) && inputData.layanan === "buka_rekening_baru", bukaRekening],
    [async ({ inputData }) => bisaDiproses(inputData) && inputData.layanan === "buka_blokir", bukaBlokir],
    [async ({ inputData }) => !bisaDiproses(inputData), diLuarLayanan],
  ])
  .then(rapikan)
  .commit();