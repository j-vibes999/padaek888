# Pa Deak Operations web application plan

Build a production backoffice system for Pa Deak canning operations.
The system serves operator Justkay and marketing sales staff.
Enforce strict domain invariants across order fulfillment, inventory, and finance.
Deliver the changes across PR-1, PR-2, PR-3, PR-4, and PR-5.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `pstack/skills/poteto-mode/playbooks/autopilot-stack.md`. The operator reviews each PR in the stack and lands the sequence bottom-up. PR-3 and PR-4 are review-gated for operator interaction sign-off.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator explicit go.
- [ ] Read these from trunk at program start. Re-read them at every tick.
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/autopilot-stack.md`
  - [ ] `git show origin/main:pstack/skills/swarm/SKILL.md`
  - [ ] `git show origin/main:plugins/cursor-team-kit/skills/control-ui/SKILL.md`
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `git show origin/main:pstack/skills/principle-model-the-domain/SKILL.md`
  - [ ] `git show origin/main:pstack/skills/principle-foundational-thinking/SKILL.md`
  - [ ] `git show origin/main:pstack/skills/principle-sequence-verifiable-units/SKILL.md`
- [ ] On the operator go, arm the audit tick as `/loop 1h` with the tick prompt below. Never leave the cadence to memory.
- [ ] Use this tick prompt verbatim. "Re-read the execution playbook from trunk. Audit the operation against it and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick row in your decision trail. The row names the items reported, or none."
- [ ] On the operator hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks.
  - [ ] PR-1 is independent and first. Branches from `main`.
  - [ ] PR-2 branches from `pr-1-domain-model`.
  - [ ] PR-3 branches from `pr-2-state-persistence`.
  - [ ] PR-4 branches from `pr-2-state-persistence`.
  - [ ] PR-5 branches from `pr-3-fulfillment-ui`.
- [ ] Hold the file boundaries. PR-1 touches only `src/domain/**`. PR-2 touches only `src/storage/**` and `src/services/**`. PR-3 touches only `src/components/fulfillment/**`. PR-4 touches only `src/components/warehouse/**`. PR-5 touches only `src/components/finance/**`.
- [ ] Hold the review gate. PR-3 and PR-4 change user interactions. They wait for operator review in chat with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Default to `gh`. If `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Record any fallback to `gh`. Never require `gt`.
- [ ] Open the PR ready, never draft, per `Opening a PR`. Use `origin pr create --status open --base <base-branch>` or `gh pr create --base <base-branch>` according to the resolved forge. A stack child targets its parent branch.
- [ ] Run the repository lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every Bugbot and security-reviewer comment per `references/bugbot-triage.md`.
- [ ] Keep the merge base in fix rounds. Rebase again only on a merge conflict with the parent branch.

### Verdict and merge, for every PR

- [ ] A full swarm runs once at the code-ready head. Run each full swarm per `pstack/skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR `Verify, live` block. The perf lane from its `Verify, perf` block. Two audit lanes that read the diff and distrust self-reports.
- [ ] Clean only when every lane is PASS. Findings go back to the owner.
- [ ] The root appends the verified PR to the base-branch stack. The operator lands the stack bottom-up.

### Boot recipe, for every live lane

Each live lane runs in a headless browser context at the PR head. Drive through `control-ui` from `cursor-team-kit`.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] Run `npm run dev -- --port 4173` and wait for HTTP 200 on `http://localhost:4173`.
- [ ] Deliver input only through `control-ui` commands. Read the console logs and DOM states.
- [ ] Save every screenshot to `/tmp/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the report.

## Define domain models and state machines (PR-1)

**Depends on.** None.

**Files.**

- [ ] Create `src/domain/types.ts`.
- [ ] Create `src/domain/sku.ts`.
- [ ] Create `src/domain/fulfillment-machine.ts`.
- [ ] Create `src/domain/inventory-ledger.ts`.
- [ ] Create `tests/domain/sku.test.ts`.
- [ ] Create `tests/domain/fulfillment.test.ts`.

**Build.**

- [ ] Define the SKU registry with `CAN_250ML` and `CAN_350ML`, each having 24 cans per case.
- [ ] Define the order state machine transitions from NEW to PACKING to OUT_FOR_DELIVERY to DELIVERED.
- [ ] Define delivery routes for LOCAL_PICKUP_TRUCK, EXPRESS_COURIER, and INTERPROVINCIAL_BUS.
- [ ] Implement pure helper functions for can and case conversions.

**You see.**

- [ ] Unit tests pass with `PASS tests/domain/sku.test.ts` and `PASS tests/domain/fulfillment.test.ts`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run `npm test -- tests/domain/`. Assert all invariants for 24-can cases and valid state transitions pass.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.7-xhigh-fast` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Verify trunk has no TypeScript domain exports. Save `/tmp/swarm-pr-1/worker-1/regression.png`. Pass when node imports `src/domain/index.ts` with exit code 0.
- [ ] Lane 2. Test 250ml case calculation with 48 cans. Save `/tmp/swarm-pr-1/worker-2/case-calc-250.png`. Pass when cases equal 2 and remainder equals 0.
- [ ] Lane 3. Test 350ml case calculation with 30 cans. Save `/tmp/swarm-pr-1/worker-3/case-calc-350.png`. Pass when cases equal 1 and remainder equals 6.
- [ ] Lane 4. Test invalid state transition from DELIVERED to PACKING. Save `/tmp/swarm-pr-1/worker-4/invalid-transition.png`. Pass when state machine throws an invalid transition error.
- [ ] Lane 5. Test valid forward progression from NEW to PACKING. Save `/tmp/swarm-pr-1/worker-5/forward-progression.png`. Pass when next status is PACKING.
- [ ] Lane 6. Test delivery route enum validation for local pickup truck. Save `/tmp/swarm-pr-1/worker-6/route-pickup.png`. Pass when route matches LOCAL_PICKUP_TRUCK.
- [ ] Lane 7. Test delivery route enum validation for Express courier. Save `/tmp/swarm-pr-1/worker-7/route-express.png`. Pass when route matches EXPRESS_COURIER.
- [ ] Lane 8. Test delivery route enum validation for Bus line. Save `/tmp/swarm-pr-1/worker-8/route-bus.png`. Pass when route matches INTERPROVINCIAL_BUS.
- [ ] Lane 9. Test inventory decrement ledger shape. Save `/tmp/swarm-pr-1/worker-9/ledger-shape.png`. Pass when ledger record contains timestamp, sku, delta, and balance.
- [ ] Lane 10. Test invoice status enum transitions. Save `/tmp/swarm-pr-1/worker-10/invoice-status.png`. Pass when status transitions from PENDING to PAID.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Execution duration of pure domain unit tests.
- [ ] Probe. Run `npm test -- --reporter=json tests/domain/` ten times interleaved with trunk.
- [ ] Baseline. Trunk has no test runner. Record 0 ms baseline.
- [ ] Rule. Head duration must stay under 400 ms.

**Review gate.** None. PR-1 is not review-gated.

**Merge.**

- [ ] Root clean verdict on PR-1 head.
- [ ] Bugbot triage complete.
- [ ] Append PR-1 to stack.

## Implement reactive store and storage layer (PR-2)

**Depends on.** PR-1.

**Files.**

- [ ] Create `src/storage/schema.ts`.
- [ ] Create `src/storage/db.ts`.
- [ ] Create `src/storage/repositories/order-repository.ts`.
- [ ] Create `src/storage/repositories/inventory-repository.ts`.
- [ ] Create `tests/storage/order-repository.test.ts`.

**Build.**

- [ ] Set up local persistence using IndexedDB with schema versioning.
- [ ] Implement atomic operations for order creation and inventory ledger commits.
- [ ] Implement seed data containing the orders and inventory shown in `PRODUCT.md`.

**You see.**

- [ ] Database initial seed completes with 4 initial orders and stock levels of 1400 cans 250ml and 1050 cans 350ml.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run `npm test -- tests/storage/`. Verify atomic order creation and rollbacks on failure.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.7-xhigh-fast` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Verify persistence roundtrip against PR-1. Save `/tmp/swarm-pr-2/worker-1/regression.png`. Pass when saved order is retrieved by id with identical fields.
- [ ] Lane 2. Verify initial seed order count. Save `/tmp/swarm-pr-2/worker-2/seed-count.png`. Pass when count equals 4.
- [ ] Lane 3. Verify stock balances for 250ml. Save `/tmp/swarm-pr-2/worker-3/stock-250.png`. Pass when balance equals 1400.
- [ ] Lane 4. Verify stock balances for 350ml. Save `/tmp/swarm-pr-2/worker-4/stock-350.png`. Pass when balance equals 1050.
- [ ] Lane 5. Verify order update persistence across page reload. Save `/tmp/swarm-pr-2/worker-5/reload-persist.png`. Pass when reloaded state retains updated status.
- [ ] Lane 6. Verify concurrent write safety on inventory ledger. Save `/tmp/swarm-pr-2/worker-6/concurrent-ledger.png`. Pass when sequential transactions produce correct sum.
- [ ] Lane 7. Verify filtering orders by status PACKING. Save `/tmp/swarm-pr-2/worker-7/filter-packing.png`. Pass when filtered list contains exactly the matching orders.
- [ ] Lane 8. Verify querying partner stores list. Save `/tmp/swarm-pr-2/worker-8/store-query.png`. Pass when 8 stores are returned.
- [ ] Lane 9. Verify error handling on corrupted storage key. Save `/tmp/swarm-pr-2/worker-9/corrupt-storage.png`. Pass when system resets gracefully with logged error.
- [ ] Lane 10. Verify export of current database to JSON. Save `/tmp/swarm-pr-2/worker-10/db-export.png`. Pass when JSON payload parses cleanly.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Query latency for loading complete dashboard snapshot.
- [ ] Probe. Measure time for `repository.getDashboardSnapshot()` over 100 runs.
- [ ] Baseline. Measure PR-1 in-memory mock baseline of 2 ms.
- [ ] Rule. Database query time must stay under 25 ms.

**Review gate.** None. PR-2 is not review-gated.

**Merge.**

- [ ] Root clean verdict on PR-2 head.
- [ ] Bugbot triage complete.
- [ ] Append PR-2 to stack.

## Build interactive fulfillment queue and route dispatch (PR-3)

**Depends on.** PR-2.

**Files.**

- [ ] Create `src/components/fulfillment/order-queue.ts`.
- [ ] Create `src/components/fulfillment/status-actions.ts`.
- [ ] Create `src/components/fulfillment/new-order-modal.ts`.
- [ ] Edit `src/index.html`.
- [ ] Edit `src/styles/main.css`.

**Build.**

- [ ] Wire the fulfillment queue table with live state transitions.
- [ ] Add the status transition click handlers to advance orders from waiting to packing to delivery to done.
- [ ] Add the new order intake modal for marketing staff with Lao field labels.
- [ ] Integrate automatic can-to-case calculations in the order intake form.

**You see.**

- [ ] Clicking the status badge advances the order state immediately and persists to storage.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run `npm test -- tests/components/fulfillment.test.ts`. Verify UI components dispatch valid actions.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.7-xhigh-fast` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Verify static queue is replaced with reactive rows. Save `/tmp/swarm-pr-3/worker-1/regression.png`. Pass when queue rows reflect database count.
- [ ] Lane 2. Click advance button on row 1 from WAITING to PACKING. Save `/tmp/swarm-pr-3/worker-2/advance-status.png`. Pass when badge text shows PACKING.
- [ ] Lane 3. Click advance button on row 1 from PACKING to OUT_FOR_DELIVERY. Save `/tmp/swarm-pr-3/worker-3/advance-delivering.png`. Pass when badge text shows OUT_FOR_DELIVERY.
- [ ] Lane 4. Click advance button on row 1 to DELIVERED. Save `/tmp/swarm-pr-3/worker-4/advance-delivered.png`. Pass when badge style matches success green.
- [ ] Lane 5. Open new order modal. Save `/tmp/swarm-pr-3/worker-5/modal-open.png`. Pass when dialog element is visible.
- [ ] Lane 6. Enter customer name and 48 cans of 250ml in modal. Save `/tmp/swarm-pr-3/worker-6/input-calc.png`. Pass when helper text displays 2 cases.
- [ ] Lane 7. Submit new order and observe new queue row. Save `/tmp/swarm-pr-3/worker-7/order-submitted.png`. Pass when queue row count increases by 1.
- [ ] Lane 8. Filter queue by route LOCAL_PICKUP_TRUCK. Save `/tmp/swarm-pr-3/worker-8/route-filter.png`. Pass when only pickup truck orders appear.
- [ ] Lane 9. Switch between Overview and Fulfillment tabs. Save `/tmp/swarm-pr-3/worker-9/tab-switch.png`. Pass when active class switches cleanly.
- [ ] Lane 10. Verify Lao font rendering and tabular numbers on LAK currency. Save `/tmp/swarm-pr-3/worker-10/lao-typography.png`. Pass when currency elements display font-variant-numeric tabular-nums.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. DOM update latency when clicking status advance button.
- [ ] Probe. Measure Performance API duration between click and DOM repaint.
- [ ] Baseline. Measure static prototype instantaneous click of 0 ms.
- [ ] Rule. End to end update latency must stay under 16 ms for 60 fps responsiveness.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2 and lane 7 screenshots into `media/pr-3-review-advance.png` and `media/pr-3-review-submit.png`.
- [ ] Record a 30 to 60 second video of order creation and status transition. Save it as `media/pr-3-review.mp4`.
- [ ] Post the screenshots and video in chat for operator review. Stop at merge-ready.

**Merge.**

- [ ] Root clean verdict on PR-3 head.
- [ ] Bugbot triage complete.
- [ ] Operator sign-off received.
- [ ] Append PR-3 to stack.

## Implement warehouse stock ledger and OEM receiving modal (PR-4)

**Depends on.** PR-2.

**Files.**

- [ ] Create `src/components/warehouse/stock-display.ts`.
- [ ] Create `src/components/warehouse/inbound-modal.ts`.
- [ ] Create `src/components/warehouse/stock-alerts.ts`.
- [ ] Edit `src/index.html`.

**Build.**

- [ ] Wire the stock display cards to live inventory balances.
- [ ] Build the OEM inbound modal to record incoming batches from the factory.
- [ ] Add the low stock threshold calculation that flags items below 500 cans.
- [ ] Connect order completion to automatic inventory ledger decrements.

**You see.**

- [ ] Submitting an OEM inbound receipt increases stock count instantly and adds an entry to the inbound card.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run `npm test -- tests/components/warehouse.test.ts`. Verify stock calculations and alert thresholds.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.7-xhigh-fast` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Verify static stock numbers are replaced with database values. Save `/tmp/swarm-pr-4/worker-1/regression.png`. Pass when stock cards display live numbers.
- [ ] Lane 2. Open OEM inbound modal. Save `/tmp/swarm-pr-4/worker-2/modal-inbound.png`. Pass when inbound form is visible.
- [ ] Lane 3. Submit OEM batch of 3000 cans 250ml and 2000 cans 350ml. Save `/tmp/swarm-pr-4/worker-3/submit-inbound.png`. Pass when 250ml stock shows 4400 cans.
- [ ] Lane 4. Verify 350ml stock update after batch receipt. Save `/tmp/swarm-pr-4/worker-4/stock-350-after.png`. Pass when 350ml stock shows 3050 cans.
- [ ] Lane 5. Trigger low stock simulation with 400 cans. Save `/tmp/swarm-pr-4/worker-5/low-stock-alert.png`. Pass when amber warning badge appears.
- [ ] Lane 6. Test can-to-case display for 4400 cans. Save `/tmp/swarm-pr-4/worker-6/case-display.png`. Pass when text displays 183 cases and 8 cans.
- [ ] Lane 7. Deliver an order of 120 cans and verify inventory decrement. Save `/tmp/swarm-pr-4/worker-7/order-deduct.png`. Pass when stock balance decreases by exactly 120.
- [ ] Lane 8. Cancel an order and verify inventory refund. Save `/tmp/swarm-pr-4/worker-8/order-refund.png`. Pass when stock balance restores by the order quantity.
- [ ] Lane 9. Verify inbound history list updates with new PO entry. Save `/tmp/swarm-pr-4/worker-9/po-list.png`. Pass when new PO card appears at top of list.
- [ ] Lane 10. Close modal by clicking backdrop or cancel button. Save `/tmp/swarm-pr-4/worker-10/modal-close.png`. Pass when modal is hidden from view.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Stock calculation and card render time after inventory transaction.
- [ ] Probe. Time ledger transaction to DOM update over 50 iterations.
- [ ] Baseline. Measure static stock card paint time of 1 ms.
- [ ] Rule. Render time must stay under 20 ms.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 3 and lane 5 screenshots into `media/pr-4-review-inbound.png` and `media/pr-4-review-alert.png`.
- [ ] Record a 30 to 60 second video of receiving an OEM batch and viewing stock alerts. Save it as `media/pr-4-review.mp4`.
- [ ] Post the screenshots and video in chat for operator review. Stop at merge-ready.

**Merge.**

- [ ] Root clean verdict on PR-4 head.
- [ ] Bugbot triage complete.
- [ ] Operator sign-off received.
- [ ] Append PR-4 to stack.

## Implement accounts receivable and payment reconciliation (PR-5)

**Depends on.** PR-3.

**Files.**

- [ ] Create `src/components/finance/invoice-list.ts`.
- [ ] Create `src/components/finance/payment-modal.ts`.
- [ ] Create `src/components/finance/sales-summary.ts`.
- [ ] Edit `src/index.html`.

**Build.**

- [ ] Wire the accounts receivable list with credit terms and overdue calculations.
- [ ] Implement payment modal supporting Cash and BCEL One transfer.
- [ ] Add the summary cards for total pending collection and received revenue in LAK.
- [ ] Add CSV export for weekly and monthly accounting reports.

**You see.**

- [ ] Clicking Pay on an invoice marks it PAID, adds transaction timestamp, and updates total collected revenue.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run `npm test -- tests/components/finance.test.ts`. Verify payment reconciliation and currency formatting.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.7-xhigh-fast` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Verify static invoice list is replaced with reactive table. Save `/tmp/swarm-pr-5/worker-1/regression.png`. Pass when invoice count matches database.
- [ ] Lane 2. Verify overdue invoice highlight on INV-2026-0408. Save `/tmp/swarm-pr-5/worker-2/overdue-highlight.png`. Pass when overdue row has warning styling.
- [ ] Lane 3. Open payment modal for invoice INV-2026-0408. Save `/tmp/swarm-pr-5/worker-3/payment-modal.png`. Pass when modal displays amount 9500000 LAK.
- [ ] Lane 4. Select payment method BCEL One transfer and enter reference. Save `/tmp/swarm-pr-5/worker-4/bcel-payment.png`. Pass when reference field validates input.
- [ ] Lane 5. Submit payment and verify invoice status changes to PAID. Save `/tmp/swarm-pr-5/worker-5/paid-status.png`. Pass when status badge displays PAID.
- [ ] Lane 6. Verify total pending receivable decreases by 9500000 LAK. Save `/tmp/swarm-pr-5/worker-6/receivable-decrease.png`. Pass when card displays updated balance.
- [ ] Lane 7. Filter invoices by status PENDING. Save `/tmp/swarm-pr-5/worker-7/filter-pending.png`. Pass when only unpaid invoices appear.
- [ ] Lane 8. Click CSV export button. Save `/tmp/swarm-pr-5/worker-8/csv-export.png`. Pass when CSV download triggers with valid headers.
- [ ] Lane 9. Verify Lao text formatting in invoice receipt preview. Save `/tmp/swarm-pr-5/worker-9/receipt-preview.png`. Pass when shop name and LAK amount render legibly.
- [ ] Lane 10. Verify topbar notification badge count updates when overdue invoice is cleared. Save `/tmp/swarm-pr-5/worker-10/notification-update.png`. Pass when badge count decrements by 1.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Financial calculation and table filtering duration.
- [ ] Probe. Run filter and total calculation over 500 invoices.
- [ ] Baseline. Measure static invoice list render of 1 ms.
- [ ] Rule. Calculation duration must stay under 15 ms.

**Review gate.** None. PR-5 is not review-gated.

**Merge.**

- [ ] Root clean verdict on PR-5 head.
- [ ] Bugbot triage complete.
- [ ] Append PR-5 to stack.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

Prototype 1 proved single-recipe SKU indexing and can-to-case calculations. Prototype branch `proto-sku-math` verified that 24-can integer division avoids rounding errors.
Prototype 2 proved the visual design token integration from `DESIGN.md`. Font loading for `Noto Sans Lao` and tabular numbers was verified in `preview.html`.
Unproven questions include offline synchronization conflicts if multiple staff members edit concurrently.

## Appendix B. Alternatives rejected

Alternative 1 was a monolithic fullstack framework rewrite using Next.js and PostgreSQL. This was rejected because the operations team needs instant local responsiveness, zero cloud database latency during delivery packing, and simple single-file deployment.
Alternative 2 was storing domain state in scattered DOM attributes. This was rejected per `principle-model-the-domain` because invalid state transitions and inventory leaks become unmanageable.

## Appendix C. Risks

Risk 1 is concurrent writes by sales staff creating orders while operations packs. PR-2 mitigates this by ordering transactions through an atomic ledger queue.
Risk 2 is browser storage quota limits on IndexedDB. PR-2 mitigates this by compacting historical ledger records monthly.

## Appendix D. Links and reading list

Read `PRODUCT.md` for product truth and business roles.
Read `DESIGN.md` for color palettes and typographic standards.
Read `pstack/skills/poteto-mode/SKILL.md` for execution protocol.
Read `pstack/skills/principle-model-the-domain/SKILL.md` before starting PR-1.
Read `pstack/skills/principle-foundational-thinking/SKILL.md` before starting PR-2.
