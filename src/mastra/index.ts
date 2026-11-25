import { Mastra } from "@mastra/core";
import { contohWorkflow } from "./workflows/workflow";
import { csWorkflow } from "./workflows/cs-workflow";
import { agenKlasifikasi } from "./agents/agen-klasifikasi";

export const mastra = new Mastra({
  workflows: { contohWorkflow, csWorkflow },
  agents: { agenKlasifikasi },
});