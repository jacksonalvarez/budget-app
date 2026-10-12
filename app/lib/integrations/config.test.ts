import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ocrCredentials, plaidCredentials, resolveIntegrationConfig } from "./config";

describe("integration config", () => {
  it("leaves both integrations off when nothing is set", () => {
    const config = resolveIntegrationConfig({});
    assert.equal(config.plaid.configured, false);
    assert.equal(config.ocr.configured, false);
    assert.match(config.plaid.reason || "", /PLAID_CLIENT_ID/);
    assert.match(config.ocr.reason || "", /MISTRAL_API_KEY/);
  });

  it("uses Mistral when that key is the only one present", () => {
    const config = resolveIntegrationConfig({ MISTRAL_API_KEY: " test-key " });
    assert.equal(config.ocr.configured, true);
    assert.equal(config.ocr.provider, "mistral");
    assert.equal(config.ocr.model, "mistral-ocr-latest");
    assert.equal(ocrCredentials({ MISTRAL_API_KEY: " test-key " })?.apiKey, "test-key");
  });

  it("does not enable Plaid for a typo in the environment", () => {
    const config = resolveIntegrationConfig({
      PLAID_CLIENT_ID: "id",
      PLAID_SECRET: "secret",
      PLAID_ENV: "prod",
    });
    assert.equal(config.plaid.configured, false);
    assert.equal(plaidCredentials({
      PLAID_CLIENT_ID: "id",
      PLAID_SECRET: "secret",
      PLAID_ENV: "prod",
    }), null);
  });

  it("honors an explicit off switch", () => {
    const config = resolveIntegrationConfig({
      PLAID_ENABLED: "false",
      PLAID_CLIENT_ID: "id",
      PLAID_SECRET: "secret",
      OCR_ENABLED: "0",
      GEMINI_API_KEY: "key",
      OCR_PROVIDER: "gemini",
    });
    assert.equal(config.plaid.configured, false);
    assert.equal(config.ocr.configured, false);
  });

  it("rejects an unknown OCR provider", () => {
    const config = resolveIntegrationConfig({
      OCR_PROVIDER: "textract",
      MISTRAL_API_KEY: "key",
    });
    assert.equal(config.ocr.configured, false);
    assert.equal(config.ocr.provider, null);
  });
});
