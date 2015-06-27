local key_inactive,
      key_active,
      key_failed,
      key_delayed,
      key_jobDetails,
      key_config = unpack(KEYS)

local timestamp,
      defaultTimeout = unpack(ARGV)

timestamp = tonumber(timestamp)

redis.call('HSETNX', key_config, 'timeout', defaultTimeout)
local timeout = redis.call('HGET', key_config, 'timeout')


local timeoutTime = timestamp - timeout
local count = 0

local jobIds = redis.call('ZRANGEBYSCORE', key_active, 0, timeoutTime)
local allowedAttempts = tonumber(redis.call('HGET', key_config, 'attempts')) or 1

for i, jobId in ipairs(jobIds) do
  fantastiq.acknowledge(
    key_inactive,
    key_active,
    key_failed,
    nil, -- no need for key_completed
    key_delayed,
    key_jobDetails,
    key_config,
    timestamp,
    jobId,
    '{\"message\":\"Job timed out\"}',
    nil -- no result
  )
end


return #jobIds
