## 0.2.0

  - Remove `retrieveN`.
  - `retrieve` now returns `0` instead of `null` for `wait` when no throttling is in place for the next item.
  - `retrieve` now also returns that `data` for a job so no subsequent `get` is strictly necessary to process it.
