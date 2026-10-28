import { test, expect } from "@playwright/test";

const base = "/";

async function startRoom(page: any) {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start a room" }).first().click();
  await page.getByLabel("Your name").fill("Maya");
  await page.getByRole("button", { name: /Create the room/ }).click();
  await page.locator(".room-pill-code").waitFor();
  return (await page.locator(".room-pill-code").textContent())?.trim() ?? "";
}

async function joinRoom(page: any, code: string, name: string) {
  await page.goto(`/?room=${code}`, { waitUntil: "networkidle" });
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: /Join the room/ }).click();
  await page.getByText("The room is ready to lie.").waitFor({ timeout: 10000 });
}

async function startMatch(page: any) {
  await page.getByRole("button", { name: /Start the match/ }).click();
  await page.locator(".writing-screen").waitFor({ timeout: 10000 });
}

async function submitLie(page: any, lie: string) {
  const input = page.locator("#lie-input");
  await input.waitFor({ state: "visible" });
  await input.fill(lie);
  await page.getByRole("button", { name: /Lock my lie/ }).click();
  await page.getByText("LOCKED IN").waitFor({ timeout: 10000 });
}

async function pickVote(page: any) {
  const option = page.locator(".vote-option:not([disabled])").first();
  await option.waitFor({ state: "visible" });
  await option.click();
  const lock = page.getByRole("button", { name: /Lock my vote/ });
  await lock.waitFor({ state: "visible" });
  await lock.click();
  await page.getByRole("button", { name: /Vote locked/ }).waitFor({ timeout: 10000 });
}

async function advanceReveal(page: any, final: boolean) {
  const button = page.getByRole("button", {
    name: final ? /See the final scores/ : /Next round/,
  });
  await button.waitFor({ state: "visible" });
  await page.waitForTimeout(1200);
  await button.click();
}

test("two players complete a match and reach results", async ({ browser }) => {
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  const errors: string[] = [];
  for (const page of [host, guest]) {
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
  }

  const code = await startRoom(host);
  expect(code.length).toBe(5);

  await Promise.all([
    host.getByText("The room is ready to lie.").waitFor({ timeout: 10000 }),
    joinRoom(guest, code, "Dev"),
  ]);

  await startMatch(host);
  await guest.locator(".writing-screen").waitFor({ timeout: 10000 });

  for (let round = 1; round <= 2; round += 1) {
    await Promise.all([
      submitLie(host, `Host cap round ${round}`),
      submitLie(guest, `Guest cap round ${round}`),
    ]);
    await Promise.all([
      host.locator(".voting-screen").waitFor({ timeout: 10000 }),
      guest.locator(".voting-screen").waitFor({ timeout: 10000 }),
    ]);
    await Promise.all([pickVote(host), pickVote(guest)]);
    await Promise.all([
      host.locator(".truth-hero").waitFor({ timeout: 10000 }),
      guest.locator(".truth-hero").waitFor({ timeout: 10000 }),
    ]);
    await Promise.all([
      advanceReveal(host, round === 2),
      advanceReveal(guest, round === 2),
    ]);
    if (round < 2) {
      await Promise.all([
        host.locator(".writing-screen").waitFor({ timeout: 10000 }),
        guest.locator(".writing-screen").waitFor({ timeout: 10000 }),
      ]);
    }
  }

  await Promise.all([
    host.locator(".results-screen").waitFor({ timeout: 10000 }),
    guest.locator(".results-screen").waitFor({ timeout: 10000 }),
  ]);

  const winner = await host.locator(".winner-header h1").textContent();
  const standings = await host.locator(".standings li").count();
  expect(standings).toBe(2);
  expect(winner).toBeTruthy();

  await hostContext.close();
  await guestContext.close();

  expect(errors).toEqual([]);
});
