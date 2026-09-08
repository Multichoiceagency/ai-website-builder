import { describe, it, expect } from "vitest";
import { createInMemoryHost, PROVIDERS } from "../index";
import { registerHost, releaseHost, requireHost } from "../runtime-context";
import {
  primeMemory,
  flushMemory,
  rememberForUser,
  loadUserMemory,
} from "../user-memory";
import { routerSource, jsxDevSource, dbSource } from "@platform/preview/runtime-sources";
import { ALLOWED_PACKAGES } from "@platform/preview";

/**
 * Rooktest voor de uit OpenThorn geporteerde motor.
 *
 * Bewijst wat een typecheck niet kan: dat de modules laden zonder de
 * browser-globals van het origineel, dat de runtime-scripts echt van schijf
 * komen (waren Vite `?raw`-imports), en dat de host-injectie tenants scheidt.
 */
describe("geporteerde motor laadt buiten de browser", () => {
  it("kent alle providers uit het origineel", () => {
    // Elf, niet twaalf: de README van OpenThorn noemt ook NVIDIA NIM, maar die
    // staat niet in providers.ts van de bron. Deze kopie is getrouw — het
    // verschil zit in hun documentatie, niet in de port.
    expect(PROVIDERS.length).toBe(11);
    expect(PROVIDERS.map((p) => p.id)).toContain("anthropic");
    expect(PROVIDERS.map((p) => p.id)).toContain("ollama");
  });

  it("kent de toegestane npm-packages voor de preview", () => {
    expect(ALLOWED_PACKAGES.length).toBeGreaterThan(0);
  });

  it("leest de preview-runtimes van schijf in plaats van via ?raw", () => {
    // Deze drie kwamen in OpenThorn binnen via Vite-specifieke imports. Buiten
    // Vite zouden ze leeg zijn; niet-lege inhoud bewijst dat de vervanging werkt.
    expect(routerSource.length).toBeGreaterThan(100);
    expect(jsxDevSource.length).toBeGreaterThan(100);
    expect(dbSource.length).toBeGreaterThan(100);
  });
});

describe("host-injectie houdt tenants gescheiden", () => {
  it("schrijft geheugen van de ene tenant niet naar de andere", async () => {
    const a = createInMemoryHost({ tenantId: "tenant-a", userId: "user-a" });
    const b = createInMemoryHost({ tenantId: "tenant-b", userId: "user-b" });
    registerHost(a);
    registerHost(b);
    await primeMemory(a.userId);
    await primeMemory(b.userId);

    rememberForUser(a.userId, "preference", "Prefers dark mode");

    expect(loadUserMemory(a.userId)).toHaveLength(1);
    expect(loadUserMemory(b.userId)).toHaveLength(0);

    await flushMemory(a.userId);
    await flushMemory(b.userId);

    expect(await a.loadMemory()).toHaveLength(1);
    expect(await b.loadMemory()).toHaveLength(0);

    releaseHost(a.userId);
    releaseHost(b.userId);
  });

  it("levert provider-sleutels via de host in plaats van uit een database", async () => {
    const host = createInMemoryHost({
      tenantId: "t1",
      userId: "u1",
      providers: [
        {
          id: "k1",
          provider_id: "anthropic",
          provider_name: "Anthropic",
          api_key: "test-key",
          base_url: null,
          models: null,
          enabled: true,
          is_custom: false,
        },
      ],
    });
    registerHost(host);
    const keys = await requireHost("u1").listProviderKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0].provider_id).toBe("anthropic");
    releaseHost("u1");
  });

  it("weigert te draaien zonder host in plaats van op gedeelde opslag terug te vallen", () => {
    // Stil doorgaan zou tenants door elkaar halen; een harde fout is hier veiliger.
    expect(() => requireHost("bestaat-niet")).toThrow(/Geen AgentHost/);
  });
});
