## 0.5.0

  - Add `unique` option to ignore duplicate jobs.
  - Support random retrieval.

## 0.4.0

  - BREAKING: format of job details is incompatible with previous versions.
  - Support backoff delay before making new attempts.

## 0.3.0

  - Support delayed jobs.
  - Support multiple attempts.
  - Add `DELETE /jobs/:id` to API.
  - Add 'Remove' button to job ui.

## 0.2.0

  - Remove `retrieveN`.
  - `retrieve` now returns `0` instead of `null` for `wait` when no throttling is in place for the next item.
  - `retrieve` now also returns that `data` for a job so no subsequent `get` is strictly necessary to process it.
