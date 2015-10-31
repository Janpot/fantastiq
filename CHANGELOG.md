# Changelog

## 1.2.0

 - Make throttle only unthrottle current job.
 - BREAKING: rename `.client()` to `.httpClient()`

## 1.1.0

 - Expand REST API.
 - Make QueueClient REST client.
 - Add basic cli tool.

## 1.0.2

 - Clean up error display in UI
 - Add stacktraces for timeouts.

## 1.0.1

 - Fix redis info command.
 - Remove highlight.js.
 - prettify links in data objects in UI.

## 1.0.0

 - move to `redis` instead of `then-redis`.

## 0.5.4

 - Show nr of attempts in UI.
 - Update UI libraries.

## 0.5.3

 - Fix issue where duplicates make `addN` stop adding values.

## 0.5.2

 - Fix worker not passing data.

## 0.5.1

 - Fix crash when randomly retrieving from empty queue.

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
