local key_inactive,
      key_active,
      key_failed,
      key_completed,
      key_delayed,
      key_jobDetails,
      key_config = unpack(KEYS)

local timestamp,
      jobId,
      err,
      result = unpack(ARGV)

timestamp = tonumber(timestamp)

return fantastiq.acknowledge(
  key_inactive,
  key_active,
  key_failed,
  key_completed,
  key_delayed,
  key_jobDetails,
  key_config,
  timestamp,
  jobId,
  err,
  result
)
