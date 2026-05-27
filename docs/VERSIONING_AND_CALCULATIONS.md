# Versioning System & Calculation Logic

This document details the transition to the 4-digit versioning system in MyWallet, along with the calculations behind our budget boundaries, goal metrics, and gamified challenges.

---

## 1. 🏷️ 4-Digit Versioning System (`2.1.0.0`)

We are transitioning from a standard 3-digit semantic version (`Major.Minor.Patch`) to a **4-digit versioning system** (`Major.Minor.Patch.Revision`) starting with **`2.1.0.0`**.

### Rationale
* **Incremental Stability:** Allows us to ship immediate quality improvements, UI adjustments, and local configurations (e.g., custom MeroShare endpoints, extension bridge synchronization) without prematurely triggering major version bumps.
* **Separation of Concerns:** Differentiates between core application feature sets (e.g., `2.1.0`) and auxiliary integration iterations (e.g., `.0` revision) to maintain clear documentation.
* **Compatibility:** Keeps release-please and standard package manifests in alignment while allowing platform-specific builds (Web, PWA, Chrome Extension, Android, iOS) to use precise sub-version tracking.

---

## 2. 📅 Budget Period Boundary Calculations

To resolve issues where historical transactions incorrectly consumed current budget limits, we implemented strict, calendar-aware period calculations in [budgets-list.tsx](file:///d:/bitnepal/projects/mywallet-app/components/budgets/budgets-list.tsx).

### Counting Rules
* **Monthly Budgets:**
  * **Start Date:** The first day (`01`) of the active budget month at `00:00:00`.
  * **Formula:** 
    $$\text{Period Start} = \text{Date}(\text{Year}, \text{Month}, 1)$$
  * All transactions dated prior to the 1st day of the current month are excluded from the spent balance.
* **Weekly Budgets:**
  * **Start Date:** The first day of the active week (normally Sunday or Monday, depending on the localized calendar structure).
  * **Formula:**
    $$\text{Period Start} = \text{DateOfStartOfWeek}(\text{CurrentDate})$$
* **Reset Boundary alignment:** Limits and transaction totals automatically align with week/month boundaries, matching standard calendar periods.

---

## 3. 🎯 Goal Metrics & Time-Worth Calculations

Goal progress in [goals-list.tsx](file:///d:/bitnepal/projects/mywallet-app/components/goals/goals-list.tsx) is calculated dynamically to show practical wealth flow.

### Calculations
1. **Needed Amount:**
   $$\text{Amount Needed} = \text{Target Amount} - \text{Current Saved}$$
2. **Time Worth (Work Hours/Days):**
   Translates the financial target into working hours based on the user's hourly wage setting (defined in user profiles).
   $$\text{Hours Needed} = \frac{\text{Amount Needed}}{\text{Hourly Rate}}$$
   $$\text{Days Needed} = \frac{\text{Hours Needed}}{\text{Working Hours Per Day}}$$

---

## 4. 🏆 Hard Plan Challenge Points & Penalties

For goals enrolled in a **Hard Plan Challenge**, additional tracking rules apply to motivate savings.

* **Point Accrual:** Points are awarded based on milestones achieved (e.g., consistent deposits, early goal completion).
* **Penalty Logic:** Applied when budgets are exceeded or contributions are missed.
* **Investment Splits:** Calculates user-allocated portions to be sent directly to stock/crypto holdings once the challenge successfully completes.
* **Use for Investment:** Links savings balances to active investment modules when user opts to deploy cash reserves.
