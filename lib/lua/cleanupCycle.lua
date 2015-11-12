local key_markedForDeletion,
      key_tmp = unpack(KEYS)

local timestamp = unpack(ARGV)

timestamp = tonumber(timestamp)


local function markOutOfDateJobs (key_source, cleanupTime)
  redis.call('DEL', key_tmp)
  redis.call('ZUNIONSTORE', key_tmp, 1, key_source)
  redis.call('ZREMRANGEBYSCORE', key_tmp, cleanupTime, '+inf')
  redis.call('ZUNIONSTORE', key_markedForDeletion, 2, key_markedForDeletion, key_tmp)
end


local removeFailedAfter = fantastiq.getConfig('removeFailedAfter')
if removeFailedAfter then
  local cleanupTime = timestamp - removeFailedAfter
  markOutOfDateJobs(fantastiq.key_failed, cleanupTime)
end

local removeCompletedAfter = fantastiq.getConfig('removeCompletedAfter')
if removeCompletedAfter then
  local cleanupTime = timestamp - removeCompletedAfter
  markOutOfDateJobs(fantastiq.key_completed, cleanupTime)
end

redis.call('DEL', key_tmp)

return redis.call('ZCARD', key_markedForDeletion)
