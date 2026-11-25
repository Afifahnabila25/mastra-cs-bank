import { z } from "zod";

export const klasifikasiSchema = z.object({
  layanan: z.enum([
    "terima_issue",
    "buka_rekening_baru",
    "buka_blokir",
    "di_luar_layanan",
  ]),
  keyakinan: z.number().min(0).max(1),
  alasan: z.string(),
  data: z.object({
    nama: z.string().optional(),
    noHp: z.string().optional(),
    ringkasanMasalah: z.string().optional(),
    kategori: z
      .enum(["kartu", "mobile_banking", "transaksi", "lainnya"])
      .optional(),
  }),
});

export type Klasifikasi = z.infer<typeof klasifikasiSchema>;