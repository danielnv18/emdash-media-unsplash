import assert from "node:assert/strict";
import { test } from "node:test";
import { unsplashImageUrl } from "../dist/index.js";

test("responsive URLs preserve ixid and use supported sizing parameters", () => {
  const url = new URL(unsplashImageUrl("https://images.unsplash.com/photo-1?ixid=abc", 768));
  assert.equal(url.searchParams.get("ixid"), "abc");
  assert.equal(url.searchParams.get("w"), "768");
  assert.equal(url.searchParams.get("fit"), "max");
  assert.equal(url.searchParams.get("auto"), "format");
});

test("untrusted image hosts cannot be used", () => {
  assert.throws(() => unsplashImageUrl("https://evil.example/photo-1?ixid=abc", 768));
});
