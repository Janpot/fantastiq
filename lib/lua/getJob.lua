local key_jobState,
      key_jobPriority,
      key_jobData,
      key_jobError,
      key_jobResult,
      key_jobCreated,
      key_jobStarted,
      key_jobFinished,
      key_jobRunAt = unpack(KEYS)

local timestamp = unpack(ARGV)
local ids = {select(2, unpack(ARGV))}


return {
  redis.call('HMGET', key_jobState, unpack(ids)),
  redis.call('HMGET', key_jobPriority, unpack(ids)),
  redis.call('HMGET', key_jobData, unpack(ids)),
  redis.call('HMGET', key_jobError, unpack(ids)),
  redis.call('HMGET', key_jobResult, unpack(ids)),
  redis.call('HMGET', key_jobCreated, unpack(ids)),
  redis.call('HMGET', key_jobStarted, unpack(ids)),
  redis.call('HMGET', key_jobFinished, unpack(ids)),
  redis.call('HMGET', key_jobRunAt, unpack(ids))
}
