import { Agent } from "@mastra/core/agent";

export const agenKlasifikasi = new Agent({
  id: "agen-klasifikasi",
  name: "Agen Klasifikasi CS Bank",
  instructions: `Kamu agen customer service bank. Tentukan layanan yang
diminta customer: terima_issue, buka_rekening_baru, atau buka_blokir.
Kalau di luar itu, isi di_luar_layanan. Ambil data yang disebut customer,
jangan mengarang data yang tidak disebut. Untuk terima_issue, isi kategori: kartu, mobile_banking, transaksi, atau lainnya.`,
  model: "google/gemini-3.5-flash-lite",
});