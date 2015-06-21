local key_inactive,
      key_active,
      key_failed,
      key_jobStarted,
      key_jobState,
      key_jobError,
      key_jobStarted,
      key_jobFinished,
      key_jobPriority,
      key_jobAttempts,
      key_config = unpack(KEYS)

local timestamp,
      defaultTimeout = unpack(ARGV)


redis.call('HSETNX', key_config, 'timeout', defaultTimeout)
local timeout = redis.call('HGET', key_config, 'timeout')


local timeoutTime = timestamp - timeout
local count = 0

local jobIds = redis.call('ZRANGEBYSCORE', key_active, 0, timeoutTime)
local allowedAttempts = tonumber(redis.call('HGET', key_config, 'attempts')) or 1

for i, jobId in ipairs(jobIds) do
  redis.call('ZREM', key_active, jobId)

  local jobAttempts = tonumber(redis.call('HGET', key_jobAttempts, jobId))
  if jobAttempts < allowedAttempts then
    local priority = tonumber(redis.call('HGET', key_jobPriority, jobId))
    redis.call('ZADD', key_inactive, priority, jobId)
    redis.call('HSET', key_jobState, jobId, 'inactive')
    redis.call('HDEL', key_jobStarted, jobId)
  else
    redis.call('ZADD', key_failed, timestamp, jobId)
    redis.call('HSET', key_jobState, jobId, 'failed')
    redis.call('HSET', key_jobError, jobId, '{\"message\":\"Job timed out\"}')
    redis.call('HSET', key_jobFinished, jobId, timestamp)
  end
end


return #jobIds
