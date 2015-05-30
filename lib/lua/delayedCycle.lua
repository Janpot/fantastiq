local key_delayed,
      key_inactive,
      key_priority,
      key_jobState,
      key_jobRunAt,
      key_tmp = unpack(KEYS)

local timestamp = unpack(ARGV)



redis.call('DEL', key_tmp)
redis.call('ZINTERSTORE', key_tmp, 1, key_delayed)
redis.call('ZREMRANGEBYSCORE', key_tmp, timestamp, '+inf')
local expired = redis.call('ZRANGE', key_tmp, 0, -1)

for i, jobId in ipairs(expired) do
  redis.call('ZREM', key_delayed, jobId)
  local priority = tonumber(redis.call('HGET', key_priority, jobId))
  redis.call('ZADD', key_inactive, priority, jobId)
  redis.call('HSET', key_jobState, jobId, 'inactive')
  redis.call('HDEL', key_jobRunAt, jobId)
end



return #expired
