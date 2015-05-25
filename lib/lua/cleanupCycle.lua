local key_markedForDeletion,
      key_failed,
      key_completed,
      key_tmp,
      key_config = unpack(KEYS)

local timestamp = unpack(ARGV)


local function markOutOfDateJobs (key_source, cleanupTime)
  redis.call('DEL', key_tmp)
  redis.call('ZUNIONSTORE', key_tmp, 1, key_source)
  redis.call('ZREMRANGEBYSCORE', key_tmp, cleanupTime, '+inf')
  redis.call('ZUNIONSTORE', key_markedForDeletion, 2, key_markedForDeletion, key_tmp)
end


local removeFailedAfter = tonumber(redis.call('HGET', key_config, 'removeFailedAfter'))
if removeFailedAfter then
  local cleanupTime = timestamp - removeFailedAfter
  markOutOfDateJobs(key_failed, cleanupTime)
end

local removeCompletedAfter = tonumber(redis.call('HGET', key_config, 'removeCompletedAfter'))
if removeCompletedAfter then
  local cleanupTime = timestamp - removeCompletedAfter
  markOutOfDateJobs(key_completed, cleanupTime)
end

redis.call('DEL', key_tmp)

return redis.call('ZCARD', key_markedForDeletion)
