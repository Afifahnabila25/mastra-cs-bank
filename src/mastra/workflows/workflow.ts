import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Step 1: bersihin teks
const bersihkanTeks = createStep({
  id: "bersihkan-teks",
  inputSchema: z.object({ teks: z.string() }),
  outputSchema: z.object({ teksBersih: z.string() }),
  execute: async ({ inputData }) => {
    return { teksBersih: inputData.teks.trim().toLowerCase() };
  },
});

// Step 2: hitung jumlah kata
const hitungKata = createStep({
  id: "hitung-kata",
  inputSchema: z.object({ teksBersih: z.string() }),
  outputSchema: z.object({ jumlahKata: z.number() }),
  execute: async ({ inputData }) => {
    return { jumlahKata: inputData.teksBersih.split(/\s+/).length };
  },
});

export const contohWorkflow = createWorkflow({
  id: "contoh-workflow",
  inputSchema: z.object({ teks: z.string() }),
  outputSchema: z.object({ jumlahKata: z.number() }),
})
  .then(bersihkanTeks)
  .then(hitungKata)
  .commit(); 