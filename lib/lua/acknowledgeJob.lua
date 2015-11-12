local key_index = unpack(KEYS)

local timestamp,
      jobId,
      err,
      result = unpack(ARGV)

timestamp = tonumber(timestamp)

return fantastiq.acknowledge(
  key_index,
  timestamp,
  jobId,
  err,
  result
)
