local key_active,
      key_inactive,
      key_completed,
      key_failed,
      key_delayed,
      key_jobState,
      key_jobPriority,
      key_jobData,
      key_jobError,
      key_jobResult,
      key_jobCreated,
      key_jobStarted,
      key_jobFinished,
      key_markForDel,
      key_jobRunAt = unpack(KEYS)

local timestamp = unpack(ARGV)
local ids = {select(2, unpack(ARGV))}

local totalRemoved = 0
totalRemoved = totalRemoved + redis.call('ZREM', key_inactive, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', key_active, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', key_completed, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', key_failed, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', key_delayed, unpack(ids))
redis.call('HDEL', key_jobState, unpack(ids))
redis.call('HDEL', key_jobPriority, unpack(ids))
redis.call('HDEL', key_jobData, unpack(ids))
redis.call('HDEL', key_jobError, unpack(ids))
redis.call('HDEL', key_jobResult, unpack(ids))
redis.call('HDEL', key_jobCreated, unpack(ids))
redis.call('HDEL', key_jobStarted, unpack(ids))
redis.call('HDEL', key_jobFinished, unpack(ids))
redis.call('HDEL', key_jobRunAt, unpack(ids))
redis.call('ZREM', key_markForDel, unpack(ids))

return totalRemoved
