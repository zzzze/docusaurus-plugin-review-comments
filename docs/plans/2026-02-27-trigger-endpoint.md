# Trigger Endpoint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `POST /api/reviews/trigger` endpoint that immediately runs one review service tick, for debugging without waiting for the interval.

**Architecture:** `createReviewsMiddleware` gains an optional 4th parameter `onTrigger?: () => Promise<void>`. When provided, a `POST /api/reviews/trigger` route is registered that calls it and returns `{ started: true }`. In `src/index.ts`, `createReviewService` (which already exposes `tick()`) is used instead of `startReviewService`, and `tick` is passed as `onTrigger`.

**Tech Stack:** Express, TypeScript, Vitest (node environment)

---

### Task 1: Add `POST /api/reviews/trigger` to middleware

**Files:**
- Modify: `src/api/reviews.ts`
- Modify: `src/__tests__/reviews.test.ts`

**Step 1: Write the failing test**

Add a new `describe` block at the end of `src/__tests__/reviews.test.ts`:

```typescript
describe("POST /api/reviews/trigger", () => {
  it("returns 404 when no onTrigger callback provided", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "POST", "/api/reviews/trigger");
    expect(res.status).toBe(404);
  });

  it("calls onTrigger and returns { started: true }", async () => {
    let called = false;
    const app = express();
    createReviewsMiddleware(app, tmpDir, "tester", async () => {
      called = true;
    });
    const res = await request(app, "POST", "/api/reviews/trigger");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ started: true });
    expect(called).toBe(true);
  });
});
```

Note: the first test reuses `tmpDir` from the outermost `beforeEach`/`afterEach` — add a `let tmpDir` and lifecycle hooks at the top of this new describe block, same pattern as the other describe blocks. Or use the existing `tmpDir` variable if it's in scope (check the file structure). Looking at the file, each `describe` block declares its own `tmpDir`. Add the same pattern:

```typescript
describe("POST /api/reviews/trigger", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reviews-trigger-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns 404 when no onTrigger callback provided", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "POST", "/api/reviews/trigger");
    expect(res.status).toBe(404);
  });

  it("calls onTrigger and returns { started: true }", async () => {
    let called = false;
    const app = express();
    createReviewsMiddleware(app, tmpDir, "tester", async () => {
      called = true;
    });
    const res = await request(app, "POST", "/api/reviews/trigger");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ started: true });
    expect(called).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/__tests__/reviews.test.ts
```

Expected: FAIL — `POST /api/reviews/trigger` returns 404 (route not registered), second test fails because `createReviewsMiddleware` doesn't accept 4th arg yet

**Step 3: Update `src/api/reviews.ts`**

Change the function signature and add the route (add before the existing `app.get("/api/reviews/pending", ...)` handler):

```typescript
export function createReviewsMiddleware(
  app: Express,
  reviewsDir: string,
  defaultAuthor: string,
  onTrigger?: () => Promise<void>,
): void {
  app.use("/api/reviews", express.json());

  if (onTrigger) {
    app.post("/api/reviews/trigger", (_req, res) => {
      void onTrigger();
      res.json({ started: true });
    });
  }

  // ... rest unchanged
```

**Step 4: Run test to verify it passes**

```bash
pnpm test src/__tests__/reviews.test.ts
```

Expected: PASS (all existing tests + 2 new trigger tests)

**Step 5: Commit**

```bash
git add src/api/reviews.ts src/__tests__/reviews.test.ts
git commit -m "feat: add POST /api/reviews/trigger endpoint"
```

---

### Task 2: Wire trigger into plugin

**Files:**
- Modify: `src/index.ts`

No new tests needed — the wiring is a one-liner change using already-tested pieces.

**Step 1: Update `src/index.ts`**

Replace `startReviewService` with `createReviewService` to get the `tick` handle, then pass `tick` as `onTrigger`:

```typescript
import { createReviewService } from "./service/index";

// inside setupMiddlewares:
const rs = options.reviewService;
if (rs?.enabled !== false) {
  const { tick } = createReviewService({
    siteDir: context.siteDir,
    reviewsDir: resolvedReviewsDir,
    siteConfig: context.siteConfig,
    intervalMs: rs?.intervalMs,
    agentCommand: rs?.agentCommand,
    agentPromptFile: rs?.agentPromptFile,
  });
  createReviewsMiddleware(app, resolvedReviewsDir, options.defaultAuthor, tick);
} else {
  createReviewsMiddleware(app, resolvedReviewsDir, options.defaultAuthor);
}
```

**Step 2: Run all tests**

```bash
pnpm test
```

Expected: All PASS

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: No new errors (pre-existing errors are fine)

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire trigger endpoint to review service tick"
```
