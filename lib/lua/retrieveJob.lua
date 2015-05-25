local key_inactive,
      key_active,
      key_jobState,
      key_started,
      key_config,
      key_throttle = unpack(KEYS)

local timestamp,
      count,
      unthrottle = unpack(ARGV)


if unthrottle == 'true' then
  redis.call('DEL', key_throttle)
end

local throttleTime = redis.call('HGET', key_config, 'throttle')

if throttleTime then
  count = 1
  local retrieveAllowed = redis.call('SET', key_throttle, 1, 'PX', throttleTime, 'NX')
  if not retrieveAllowed then
    local waitTime = redis.call('PTTL', key_throttle)
    return {{}, waitTime}
  end
end


local jobIds = redis.call('ZRANGE', key_inactive, 0, count - 1)

for i, jobId in ipairs(jobIds) do
  redis.call('ZREM', key_inactive, jobId)
  redis.call('ZADD', key_active, timestamp, jobId)
  redis.call('HSET', key_jobState, jobId, 'active')
  redis.call('HSET', key_started, jobId, timestamp)
end

local waitTime = redis.call('PTTL', key_throttle)

return {jobIds, waitTime}
